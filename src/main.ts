import { Plugin, TFile, TFolder } from "obsidian";
import {
	DEFAULT_SETTINGS,
	type SmartPrintPluginSettings,
} from "./types.ts";
import { printFolder } from "./folderPrint.ts";
import { printContent } from "./basicPrint/basicPrint.ts";
import {
	advancedPrint,
} from "./advancedPrint/advancedPrint.ts";
import { PrintModeModal } from "./PrintModeModal.ts";
import { contentToHTML } from "./normalCapturePreview.ts";
import {
	initializeThemeColors,
	initializeFontSizes,
	PrintSettingTab,
} from "./settings.ts";
import {
	openPrintModal,
} from "./basicPrint/basicPrintPreview.ts";
import {
	generatePrintStyles,
} from "./getStyles/generatePrintStyles.ts";
import { isMobile } from "./utils/platform.ts";

export default class SmartPrintPlugin extends Plugin {
	settings: SmartPrintPluginSettings;

	async onload(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);

		// Initialize header colors if not done before
		if (!this.settings.hasInitializedColors) {
			await initializeThemeColors(this.app, this);
		}
		// Initialize font sizes if not done before
		if (!this.settings.hasInitializedSizes) {
			await initializeFontSizes(this);
		}

		this.registerCommands();
		this.registerMenus();
		this.addSettingTab(new PrintSettingTab(this.app, this));
	}

	// ─── Commands ──────────────────────────────────────────

	/**
	 * Registers all plugin commands in the command palette.
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
			callback: async () => await this.basicPrint(),
		});

		this.addCommand({
			id: "print-selection",
			name: "Selection",
			callback: async () =>
				await this.handlePrint(false, true),
		});

		this.addCommand({
			id: "print-folder-notes",
			name: "All notes in current folder",
			callback: async () => await printFolder(this),
		});

		// Add debounce to prevent double triggering
		let isProcessing = false;
		this.addRibbonIcon(
			"printer",
			"Print note",
			async () => {
				if (isProcessing) return;
				isProcessing = true;
				await this.handlePrint();
				setTimeout(() => {
					isProcessing = false;
				}, 500);
			},
		);
	}

	// ─── Context Menus ─────────────────────────────────────

	/**
	 * Registers context menu items for files, folders,
	 * and the editor.
	 */
	private registerMenus(): void {
		// File explorer context menu
		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				(menu, file) => {
					if (file instanceof TFile) {
						menu.addItem((item) => {
							item.setTitle("Print note")
								.setIcon("printer")
								.onClick(
									async () =>
										await this.handlePrint(
											true,
											false,
											file,
										),
								);
						});
					} else {
						menu.addItem((item) => {
							item.setTitle(
								"Print all notes in folder",
							)
								.setIcon("printer")
								.onClick(
									async () =>
										await printFolder(
											this,
											file as TFolder,
										),
								);
						});
					}
				},
			),
		);

		// Editor right-click context menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu) => {
				menu.addItem((item) => {
					item.setTitle("Print note")
						.setIcon("printer")
						.onClick(
							async () =>
								await this.handlePrint(),
						);
				});
				menu.addItem((item) => {
					item.setTitle("Print selection")
						.setIcon("printer")
						.onClick(
							async () =>
								await this.handlePrint(
									false,
									true,
								),
						);
				});
			}),
		);
	}

	// ─── Print Logic ───────────────────────────────────────

	/**
	 * Prepares HTML content from the active note or file.
	 * Shows a Notice if no content is available.
	 *
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 * @returns Rendered HTML element, or null
	 */
	private async preparePrintContent(
		isSelection: boolean,
		file?: TFile,
	): Promise<HTMLElement | null> {
		return await contentToHTML(
			this.app,
			this.settings,
			isSelection,
			file,
		);
	}

	/**
	 * Main print entry point. Routes to the correct mode:
	 * - Mobile: always uses basicPrint (no modal)
	 * - Desktop with modal: shows PrintModeModal
	 * - Desktop without modal: uses settings to decide
	 *
	 * @param useAdvancedPrint - Allow advanced mode option
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 */
	public async handlePrint(
		useAdvancedPrint = true,
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		// Mobile: always go directly to basic print
		// No modal needed — only one print engine available
		if (isMobile()) {
			await this.basicPrint(isSelection, file);
			return;
		}

		// Desktop: show modal or use settings-based routing
		if (this.settings.useModal) {
			new PrintModeModal(
				this,
				this.app,
				this.settings,
				useAdvancedPrint,
				async (state) => {
					if (
						useAdvancedPrint &&
						state === "advanced"
					) {
						await advancedPrint(
							this.app,
							this.manifest,
							this.settings,
							isSelection,
						);
					} else if (state === "standard") {
						await this.standardPrint(
							isSelection,
							file,
						);
					} else {
						await this.basicPrint(
							isSelection,
							file,
						);
					}
				},
				async () => await this.saveSettings(),
			).open();
		} else {
			if (this.settings.useBrowserPrint) {
				await this.standardPrint(isSelection, file);
			} else {
				await this.basicPrint(isSelection, file);
			}
		}
	}

	/**
	 * Standard print: renders markdown to HTML then opens
	 * it in the system browser with auto print dialog.
	 * Desktop only.
	 *
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 */
	async standardPrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		const content = await this.preparePrintContent(
			isSelection,
			file,
		);
		if (!content) return;
		await printContent(
			content,
			this.app,
			this.manifest,
			this.settings,
		);
	}

	/**
	 * Basic print: renders markdown to HTML then displays
	 * an in-app preview with Printd.
	 * Works on both desktop and mobile.
	 *
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 */
	async basicPrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		const content = await this.preparePrintContent(
			isSelection,
			file,
		);
		if (!content) return;

		const globalCSS = await generatePrintStyles(
			this.app,
			this.manifest,
			this.settings,
		);
		await openPrintModal(
			content,
			this.settings,
			globalCSS,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

