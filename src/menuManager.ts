import { Menu, TFile, TFolder } from "obsidian";
import SmartPrintPlugin from "./main.ts";
import { printFolder } from "./folderPrint.ts";

/**
 * Shared menu key for reading mode context menu.
 * Multiple plugins can add items to the same menu using this convention.
 */
const SHARED_READING_MENU_KEY = "_sharedReadingMenu";

/**
 * Registers all context menus for the plugin.
 * Handles both file explorer context menu, editor context menu,
 * and reading mode context menu.
 * Respects showContextMenu setting.
 */
export function registerMenus(plugin: SmartPrintPlugin): void {
	// Register file explorer context menu (right-click on files/folders).
	// This adds print options when users right-click on files or folders
	// in the file explorer sidebar.
	plugin.registerEvent(
		plugin.app.workspace.on("file-menu", (menu, file, source) => {
			if (!plugin.settings.showContextMenu) return;
			if (file instanceof TFile || file instanceof TFolder) {
				addFileMenuItems(plugin, menu, file, source);
			}
		}),
	);

	// Register editor context menu (right-click inside the editor).
	// This adds print options when users right-click within the note content,
	// allowing them to print the current note or selected text.
	plugin.registerEvent(
		plugin.app.workspace.on("editor-menu", (menu) => {
			if (!plugin.settings.showContextMenu) return;
			addEditorMenuItems(plugin, menu);
		}),
	);

	// Reading mode context menu (right-click in reading mode).
	// Uses shared menu pattern to allow multiple plugins to add items.
	plugin.app.workspace.onLayoutReady(() => {
		plugin.registerDomEvent(document, "contextmenu", (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			// Check if we're in reading mode (reading view)
			if (!target.closest(".markdown-preview-view")) return;
			// Don't show menu if there's text selection
			if (window.getSelection()?.toString()) return;

			e.preventDefault();
			const w = window as any;

			if (w[SHARED_READING_MENU_KEY]) {
				addReadingModeMenuItems(plugin, w[SHARED_READING_MENU_KEY]);
				return;
			}

			w[SHARED_READING_MENU_KEY] = new Menu();
			setTimeout(() => {
				const menu = w[SHARED_READING_MENU_KEY];
				delete w[SHARED_READING_MENU_KEY];
				menu.showAtMouseEvent(e);
			}, 0);

			addReadingModeMenuItems(plugin, w[SHARED_READING_MENU_KEY]);
		});
	});
}

/**
 * Adds print items to the file explorer menu.
 *
 * Behavior varies based on context:
 * - File explorer: Single "Print note" item
 * - Other contexts: Submenu with "Print note" and "Print selection" options
 *
 * Groups under submenu if useSubmenu is enabled.
 */
export function addFileMenuItems(
	plugin: SmartPrintPlugin,
	menu: Menu,
	file: TFile | TFolder,
	source: string,
): void {
	const editor = plugin.app.workspace.activeEditor?.editor;
	const hasSelection = !!editor?.getSelection();

	if (file instanceof TFile) {
		// File explorer context: Add simple print option without submenu.
		// This keeps the context menu clean when right-clicking files in the sidebar.
		if (source === "file-explorer-context-menu") {
			menu.addItem((item) => {
				item.setTitle("Print note")
					.setIcon("printer")
					.onClick(async () => await plugin.handlePrint(false, file));
			});
		} else {
			// Other contexts (e.g., tab header): Add submenu with more options.
			// This provides access to both note printing and selection printing.
			menu.addItem((item) => {
				item.setTitle("Smart Print").setIcon("printer");

				const sub = item.setSubmenu();

				sub.addItem((subItem) => {
					subItem
						.setTitle("Print note")
						.setIcon("file-text")
						.onClick(
							async () => await plugin.handlePrint(false, file),
						);
				});
				sub.addItem((subItem) => {
					subItem
						.setTitle("Print selection")
						.setIcon("text-select")
						.setDisabled(!hasSelection)
						.onClick(
							async () => await plugin.handlePrint(true, file),
						);
				});
			});
		}
	} else {
		// Folder context: Add option to print all notes in the folder.
		// This allows batch printing of multiple notes at once.
		menu.addItem((item) => {
			item.setTitle("Print all notes in folder")
				.setIcon("printer")
				.onClick(
					async () => await printFolder(plugin, file as TFolder),
				);
		});
	}
}

/**
 * Adds print items to the editor right-click menu.
 *
 * Provides options to print the current note or selected text.
 * Groups under submenu if useSubmenu is enabled in settings.
 */
export function addEditorMenuItems(plugin: SmartPrintPlugin, menu: Menu): void {
	const editor = plugin.app.workspace.activeEditor?.editor;
	const hasSelection = !!editor?.getSelection();

	if (plugin.settings.useSubmenu) {
		// Submenu mode: Group print options under "Smart Print" submenu.
		// This keeps the context menu organized when multiple plugins add items.
		menu.addItem((item) => {
			item.setTitle("Smart Print").setIcon("printer");

			const sub = item.setSubmenu();

			sub.addItem((subItem) => {
				subItem
					.setTitle("Print note")
					.setIcon("file-text")
					.onClick(async () => await plugin.handlePrint(false));
			});
			sub.addItem((subItem) => {
				subItem
					.setTitle("Print selection")
					.setIcon("text-select")
					.setDisabled(!hasSelection)
					.onClick(async () => await plugin.handlePrint(true));
			});
		});
	} else {
		// Flat mode: Add print options directly to the context menu.
		// This provides quicker access but can clutter the menu.
		menu.addItem((item) => {
			item.setTitle("Print note")
				.setIcon("printer")
				.onClick(async () => await plugin.handlePrint(false));
		});
		menu.addItem((item) => {
			item.setTitle("Print selection")
				.setIcon("printer")
				.setDisabled(!hasSelection)
				.onClick(async () => await plugin.handlePrint(true));
		});
	}
}

/**
 * Adds print items to the reading mode context menu.
 * Provides option to print the current note when right-clicking
 * in reading mode without text selection.
 */
export function addReadingModeMenuItems(
	plugin: SmartPrintPlugin,
	menu: Menu,
): void {
	menu.addItem((item) => {
		item.setTitle("Print note")
			.setIcon("printer")
			.onClick(async () => await plugin.handlePrint(false));
	});
}
