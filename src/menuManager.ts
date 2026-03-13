import { Menu, TFile, TFolder } from "obsidian";
import SmartPrintPlugin from "./main.ts";
import { printFolder } from "./folderPrint.ts";

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
					.onClick(
						async () =>
							await plugin.handlePrint(
								false,
								file,
							),
					);
			});
		} else {
			// Other contexts (e.g., tab header): Add submenu with more options.
			// This provides access to both note printing and selection printing.
			menu.addItem((item) => {
				const sub = (
					item
						.setTitle("Smart Print")
						.setIcon("printer") as any
				).setSubmenu() as Menu;

				sub.addItem((subItem) => {
					subItem
						.setTitle("Print note")
						.setIcon("file-text")
						.onClick(
							async () =>
								await plugin.handlePrint(
									false,
									file,
								),
						);
				});
				sub.addItem((subItem) => {
					subItem
						.setTitle("Print selection (basic print)")
						.setIcon("text-select")
						.setDisabled(!hasSelection)
						.onClick(
							async () =>
								await plugin.handlePrint(
									true,
									file,
								),
						);
				});
			});
		}
	} else {
		// Folder context: Add option to print all notes in the folder.
		// This allows batch printing of multiple notes at once.
		menu.addItem((item) => {
			item.setTitle(
				"Print all notes in folder",
			)
				.setIcon("printer")
				.onClick(
					async () =>
						await printFolder(
							plugin,
							file as TFolder,
						),
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
export function addEditorMenuItems(
	plugin: SmartPrintPlugin,
	menu: Menu,
): void {
	const editor = plugin.app.workspace.activeEditor?.editor;
	const hasSelection = !!editor?.getSelection();

	if (plugin.settings.useSubmenu) {
		// Submenu mode: Group print options under "Smart Print" submenu.
		// This keeps the context menu organized when multiple plugins add items.
		menu.addItem((item) => {
			const sub = (
				item
					.setTitle("Smart Print")
					.setIcon("printer") as any
			).setSubmenu() as Menu;

			sub.addItem((subItem) => {
				subItem
					.setTitle("Print note")
					.setIcon("file-text")
					.onClick(
						async () =>
							await plugin.handlePrint(false),
					);
			});
			sub.addItem((subItem) => {
				subItem
					.setTitle("Print selection (basic print)")
					.setIcon("text-select")
					.setDisabled(!hasSelection)
					.onClick(
						async () =>
							await plugin.handlePrint(
								true,
							),
					);
			});
		});
	} else {
		// Flat mode: Add print options directly to the context menu.
		// This provides quicker access but can clutter the menu.
		menu.addItem((item) => {
			item.setTitle("Print note")
				.setIcon("printer")
				.onClick(
					async () =>
						await plugin.handlePrint(false),
				);
		});
		menu.addItem((item) => {
			item.setTitle("Print selection (basic print)")
				.setIcon("printer")
				.setDisabled(!hasSelection)
				.onClick(
					async () =>
						await plugin.handlePrint(
							true,
						),
				);
		});
	}
}
