import { Plugin, TFile, TFolder, debounce } from "obsidian";
import { DEFAULT_SETTINGS, type SmartPrintPluginSettings } from "./types.ts";
import { printFolder } from "./folderPrint.ts";
import { PrintModeModal } from "./PrintModeModal.ts";
import {
	initializeThemeColors,
	initializeFontSizes,
	PrintSettingTab,
} from "./settings.ts";
import { openPrintModal, directPrint } from "./basicPrint/basicPrintPreview.ts";
import { generatePrintStyles } from "./getStyles/generatePrintStyles.ts";
import { isMobile } from "./utils/platform.ts";
import { addFileMenuItems, addEditorMenuItems } from "./menuManager.ts";
import { getBestContent, getBestPrintEngine } from "./captureStrategy.ts";
import { PrintManager } from "./browserPrintManager.ts";
import { scanContentFlags } from "./utils/contentScanner.ts";

// Timing constants
const RIBBON_ICON_DEBOUNCE_MS = 500; // Debounce delay for ribbon icon clicks to prevent double-printing

export default class SmartPrintPlugin extends Plugin {
	settings: SmartPrintPluginSettings;
	/** Reference to remove ribbon icon dynamically */
	private ribbonIconEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize theme colors on first run only.
		// This ensures we have accurate heading colors from the user's theme
		// without overwriting their custom colors on subsequent loads.
		if (!this.settings.hasInitializedColors) {
			await initializeThemeColors(this.app, this);
		}

		// Initialize proportional font sizes on first run only.
		// This calculates heading sizes based on the base font size,
		// providing sensible defaults without overwriting user customizations.
		if (!this.settings.hasInitializedSizes) {
			await initializeFontSizes(this);
		}

		this.registerCommands();
		this.registerMenus();
		this.updateRibbonIcon();
		this.addSettingTab(new PrintSettingTab(this.app, this));
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

		// 2. Anti-spam protection using debounce.
		// Generating print HTML can be resource-intensive. If a user double-clicks
		// the icon (especially on touch devices), we don't want to run the print
		// logic twice simultaneously, which could cause performance issues or conflicts.
		// The 'true' parameter means leading edge execution: first click executes
		// immediately, subsequent clicks within the debounce period are ignored.
		const debouncedPrint = debounce(
			async () => {
				await this.handlePrint();
			},
			RIBBON_ICON_DEBOUNCE_MS,
			true,
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
			callback: async () => await this.handlePrint(),
		});

		this.addCommand({
			id: "quick-print-note",
			name: "Quick print (no modal)",
			callback: async () => await this.unifiedPrint(),
		});

		this.addCommand({
			id: "print-selection",
			name: "Selection (basic print)",
			callback: async () => await this.handlePrint(true),
		});

		this.addCommand({
			id: "print-folder-notes",
			name: "All notes in current folder",
			callback: async () => await printFolder(this),
		});
	}

	// ─── Context Menus ─────────────────────────────────

	/**
	 * Registers context menu items for files, folders,
	 * and the editor. Respects showContextMenu and
	 * useSubmenu settings.
	 */
	private registerMenus(): void {
		// Register file explorer context menu (right-click on files/folders).
		// This adds print options when users right-click on files or folders
		// in the file explorer sidebar.
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source) => {
				if (!this.settings.showContextMenu) return;
				if (file instanceof TFile || file instanceof TFolder) {
					addFileMenuItems(this, menu, file, source);
				}
			}),
		);

		// Register editor context menu (right-click inside the editor).
		// This adds print options when users right-click within the note content,
		// allowing them to print the current note or selected text.
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu) => {
				if (!this.settings.showContextMenu) return;
				addEditorMenuItems(this, menu);
			}),
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
	public async handlePrint(isSelection = false, file?: TFile): Promise<void> {
		const mobile = isMobile();

		// Mobile: skip modal and print directly.
		// Mobile devices have limited screen space, so we bypass the
		// options modal and use the saved settings directly.
		if (mobile) {
			await this.unifiedPrint(isSelection, file);
			return;
		}

		// Desktop: show options modal if enabled in settings.
		// The modal allows users to adjust print settings (font, colors, etc.)
		// before printing. If disabled, print immediately with saved settings.
		if (this.settings.useModal) {
			const targetFile = file ?? this.app.workspace.getActiveFile();
			const contentFlags = await scanContentFlags(
				this.app.vault,
				targetFile ?? undefined,
			);
			
			new PrintModeModal(
				this,
				this.app,
				this.settings,
				async () => {
					await this.unifiedPrint(isSelection, file);
				},
				async () => await this.saveSettings(),
				false,
				contentFlags,
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
	async unifiedPrint(isSelection = false, file?: TFile): Promise<void> {
		// 1. Capture content using the best available method.
		// This tries advanced DOM capture first (for Mermaid, Dataview, etc.),
		// then falls back to standard Markdown rendering if needed.
		const content = await getBestContent(
			this.app,
			this.settings,
			isSelection,
			file,
		);
		if (!content) return;

		// 2. Generate CSS styles for the print output.
		// This includes font settings, colors, page breaks, and custom snippets.
		const globalCSS = await generatePrintStyles(
			this.app,
			this.manifest,
			this.settings,
		);

		// 3. Select the appropriate print engine based on platform and settings.
		// Browser print (desktop): Opens in system browser for full print options.
		// Printd (mobile/desktop): Uses in-app print dialog.
		const engine = getBestPrintEngine(this.settings, isMobile());

		if (engine === "browser") {
			// Browser print: Create temporary HTML file and open in default browser.
			// This provides better text rendering and more print options.
			const filePath =
				file?.path ??
				this.app.workspace.getActiveFile()?.path ??
				"Untitled";
			const printer = new PrintManager();
			await printer.browserPrint(
				printer.createPrintableHtml(content, globalCSS, true, filePath),
			);
		} else {
			// Printd: Use in-app printing with Electron/mobile print dialog.
			// Respects skipPreview setting to show/hide preview window.
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
