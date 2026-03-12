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
import {
	printContent,
} from "./basicPrint/basicPrint.ts";
import {
	advancedPrint,
} from "./advancedPrint/advancedPrint.ts";
import { PrintModeModal } from "./PrintModeModal.ts";
import {
	contentToHTML,
} from "./normalCapturePreview.ts";
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
			callback: async () =>
				await this.basicPrint(),
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
				(menu, file) => {
					if (!this.settings.showContextMenu)
						return;
					if (
						file instanceof TFile ||
						file instanceof TFolder
					) {
						this.addFileMenuItems(
							menu,
							file,
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
					this.addEditorMenuItems(menu);
				},
			),
		);
	}

	/**
	 * Adds print items to the file explorer menu.
	 * Groups under submenu if useSubmenu is enabled.
	 */
	private addFileMenuItems(
		menu: Menu,
		file: TFile | TFolder,
	): void {
		if (file instanceof TFile) {
			if (this.settings.useSubmenu) {
				menu.addItem((item) => {
					item.setTitle("Smart Print")
						.setIcon("printer")
						.setSubmenu();
				});
				// Items added via submenu API
				// will be inside the submenu
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
			}
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
	}

	/**
	 * Adds print items to the editor right-click menu.
	 * Groups under submenu if useSubmenu is enabled.
	 */
	private addEditorMenuItems(menu: Menu): void {
		if (this.settings.useSubmenu) {
			menu.addItem((item) => {
				const sub = (
					item
						.setTitle("Smart Print")
						.setIcon("printer") as any // eslint-disable-line @typescript-eslint/no-explicit-any
				).setSubmenu() as Menu;

				sub.addItem((subItem) => {
					subItem
						.setTitle("Print note")
						.setIcon("file-text")
						.onClick(
							async () =>
								await this.handlePrint(),
						);
				});
				sub.addItem((subItem) => {
					subItem
						.setTitle("Print selection")
						.setIcon("text-select")
						.onClick(
							async () =>
								await this.handlePrint(
									false,
									true,
								),
						);
				});
			});
		} else {
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
		}
	}

	// ─── Print Logic ───────────────────────────────────

	/**
	 * Prepares HTML content from the active note.
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
	 * Main print entry point. Routes to correct mode:
	 * - Mobile: always uses basicPrint (no modal)
	 * - Desktop with modal: shows PrintModeModal
	 * - Desktop without modal: settings-based routing
	 *
	 * @param useAdvancedPrint - Allow advanced option
	 * @param isSelection - Print selected text only
	 * @param file - Specific file to print
	 */
	public async handlePrint(
		useAdvancedPrint = true,
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		// Mobile: always go directly to basic print
		if (isMobile()) {
			await this.basicPrint(isSelection, file);
			return;
		}

		// Desktop: show modal or settings-based routing
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
					} else if (
						state === "standard"
					) {
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
				async () =>
					await this.saveSettings(),
			).open();
		} else {
			if (this.settings.useBrowserPrint) {
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
		}
	}

	/**
	 * Standard print: renders markdown to HTML then
	 * opens it in the system browser.
	 * Desktop only.
	 */
	async standardPrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		const content =
			await this.preparePrintContent(
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
	 * Basic print: renders markdown to HTML then
	 * either shows a preview or prints directly.
	 * Works on both desktop and mobile.
	 *
	 * If skipPreview is enabled, uses Printd to
	 * print immediately without preview window.
	 */
	async basicPrint(
		isSelection = false,
		file?: TFile,
	): Promise<void> {
		const content =
			await this.preparePrintContent(
				isSelection,
				file,
			);
		if (!content) return;

		const globalCSS = await generatePrintStyles(
			this.app,
			this.manifest,
			this.settings,
		);

		if (this.settings.skipPreview) {
			// Print directly without preview
			await directPrint(
				content,
				this.settings,
				globalCSS,
			);
		} else {
			// Show preview first
			await openPrintModal(
				content,
				this.settings,
				globalCSS,
			);
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
