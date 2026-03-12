import {
	Plugin,
	TFile,
	TFolder,
	debounce,
	type Menu,
} from "obsidian";
import {
	DEFAULT_SETTINGS,
	type SmartPrintPluginSettings,
} from "./types.ts";
import { printFolder } from "./folderPrint.ts";
import { PrintModeModal } from "./PrintModeModal.ts";
import {
	initializeThemeColors,
	initializeFontSizes,
	PrintSettingTab,
} from "./settings.ts";
import {
	openPrintModal,
	directPrint,
} from "./basicPrint/basicPrintPreview.ts";
import {
	generatePrintStyles,
} from "./getStyles/generatePrintStyles.ts";
import { isMobile } from "./utils/platform.ts";
import {
	addFileMenuItems,
	addEditorMenuItems,
} from "./menuManager.ts";
import { getBestContent, getBestPrintEngine } from "./captureStrategy.ts";
import { PrintManager } from "./browserPrintManager.ts";

export default class SmartPrintPlugin extends Plugin {
	settings: SmartPrintPluginSettings;
	/** Reference to remove ribbon icon dynamically */
	private ribbonIconEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize header colors if not done before
		// Useful so we have accurate colors for printing headings from theme

		if (!this.settings.hasInitializedColors) {
			await initializeThemeColors(
				this.app,
				this,
			);
		}
		// Initialize font sizes if not done before
		if (!this.settings.hasInitializedSizes) {
			await initializeFontSizes(this);
		}

		this.registerCommands();
		this.registerMenus();
		this.updateRibbonIcon();
		this.addSettingTab(
			new PrintSettingTab(this.app, this),
		);
	}

	// ─── Ribbon Icon ───────────────────────────────────

	/**
	 * Adds or removes the ribbon icon based on the
	 * showRibbonIcon setting. Called on load and when
	 * the setting changes.
	 */
	updateRibbonIcon(): void {
		// 1. Always remove the existing icon first.
		// This is necessary because this function is called every time
		// the user toggles the setting in the options. If we didn't remove it,
		// toggling the setting multiple times would stack multiple icons.
		if (this.ribbonIconEl) {
			this.ribbonIconEl.remove();
			this.ribbonIconEl = null;
		}

		// If the user disabled the icon in settings, we stop here (icon remains removed).
		if (!this.settings.showRibbonIcon) return;

		// 2. Anti-spam lock (Debounce)
		// Generating print HTML can be heavy. If a user double-clicks the icon
		// (especially on touch devices), we don't want to run the print logic twice.
		// We use Obsidian's native debounce function to suppress rapid repeated clicks.
		const debouncedPrint = debounce(
			async () => {
				await this.handlePrint();
			},
			500,
			true, // 'true' means it triggers on the *leading* edge (immediate execution, ignoring subsequent clicks for 500ms)
		);

		this.ribbonIconEl = this.addRibbonIcon(
			"printer",
			"Print note",
			debouncedPrint,
		);
	}

	// ─── Commands ──────────────────────────────────────

	/**
	 * Registers all plugin commands in palette.
	 */
	private registerCommands(): void {
		this.addCommand({
			id: "print-note",
			name: "Current note",
			callback: async () =>
				await this.handlePrint(),
		});

		this.addCommand({
			id: "quick-print-note",
			name: "Quick print (no modal)",
			callback: async () => await this.unifiedPrint(),
		});

		this.addCommand({
			id: "print-selection",
			name: "Selection (basic print)",
			callback: async () =>
				await this.handlePrint(true),
		});

		this.addCommand({
			id: "print-folder-notes",
			name: "All notes in current folder",
			callback: async () =>
				await printFolder(this),
		});
	}

	// ─── Context Menus ─────────────────────────────────

	/**
	 * Registers context menu items for files, folders,
	 * and the editor. Respects showContextMenu and
	 * useSubmenu settings.
	 */
	private registerMenus(): void {
		// File explorer context menu
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu, file, source) => {
					if (!this.settings.showContextMenu)
						return;
					if (
						file instanceof TFile ||
						file instanceof TFolder
					) {
						addFileMenuItems(
							this,
							menu,
							file,
							source,
						);
					}
				},
			),
		);

		// Editor right-click context menu
		this.registerEvent(
			this.app.workspace.on(
				"editor-menu",
				(menu) => {
					if (
						!this.settings.showContextMenu
					)
						return;
					addEditorMenuItems(this, menu);
				},
			),
		);
	}


	// ─── Print Logic ───────────────────────────────────

	/**
		 * Main print entry point with unified capture strategy.
		 * Uses best available capture method automatically.
		 * 
		 * @param isSelection - Print selected text only
		 * @param file - Specific file to print
		 */
	public async handlePrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		const mobile = isMobile();

		// Mobile: skip modal, print directly
		if (mobile) {
			await this.unifiedPrint(isSelection, file);
			return;
		}

		// Desktop: show modal if enabled
		if (this.settings.useModal) {
			new PrintModeModal(
				this,
				this.app,
				this.settings,
				async () => {
					await this.unifiedPrint(isSelection, file);
				},
				async () => await this.saveSettings(),
			).open();
		} else {
			await this.unifiedPrint(isSelection, file);
		}
	}

	/**
	 * Unified print method using best capture strategy.
	 * Automatically selects best capture method and print engine.
	 * 
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 */
	async unifiedPrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		// Get best content using unified capture strategy
		const content = await getBestContent(
			this.app,
			this.settings,
			isSelection,
			file,
		);
		if (!content) return;

		// Generate styles
		const globalCSS = await generatePrintStyles(
			this.app,
			this.manifest,
			this.settings,
		);

		// Determine best print engine
		const engine = getBestPrintEngine(
			this.settings,
			isMobile(),
		);

		if (engine === "browser") {
			// Browser print (desktop only)
			const filePath = file?.path ?? this.app.workspace.getActiveFile()?.path ?? "Untitled";
			const printer = new PrintManager();
			await printer.browserPrint(
				printer.createPrintableHtml(
					content,
					globalCSS,
					true,
					filePath,
				),
			);
		} else {
			// Printd (mobile or desktop basic)
			if (this.settings.skipPreview) {
				await directPrint(content, this.settings, globalCSS);
			} else {
				await openPrintModal(content, this.settings, globalCSS);
			}
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
