import { Menu, TFile, TFolder } from "obsidian";
import SmartPrintPlugin from "./main.ts";
import { printFolder } from "./folderPrint.ts";

/**
 * Adds print items to the file explorer menu.
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
 * Groups under submenu if useSubmenu is enabled.
 */
export function addEditorMenuItems(
	plugin: SmartPrintPlugin,
	menu: Menu,
): void {
	const editor = plugin.app.workspace.activeEditor?.editor;
	const hasSelection = !!editor?.getSelection();

	if (plugin.settings.useSubmenu) {
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
