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
								true,
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
						.setIcon("printer") as any // eslint-disable-line @typescript-eslint/no-explicit-any
				).setSubmenu() as Menu;

				sub.addItem((subItem) => {
					subItem
						.setTitle("Print note")
						.setIcon("file-text")
						.onClick(
							async () =>
								await plugin.handlePrint(
									true,
									false,
									file,
								),
						);
				});
				sub.addItem((subItem) => {
					subItem
						.setTitle("Print selection")
						.setIcon("text-select")
						.setDisabled(!hasSelection)
						.onClick(
							async () =>
								await plugin.handlePrint(
									false,
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
					.setIcon("printer") as any // eslint-disable-line @typescript-eslint/no-explicit-any
			).setSubmenu() as Menu;

			sub.addItem((subItem) => {
				subItem
					.setTitle("Print note")
					.setIcon("file-text")
					.onClick(
						async () =>
							await plugin.handlePrint(),
					);
			});
			sub.addItem((subItem) => {
				subItem
					.setTitle("Print selection")
					.setIcon("text-select")
					.setDisabled(!hasSelection)
					.onClick(
						async () =>
							await plugin.handlePrint(
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
						await plugin.handlePrint(),
				);
		});
		menu.addItem((item) => {
			item.setTitle("Print selection")
				.setIcon("printer")
				.setDisabled(!hasSelection)
				.onClick(
					async () =>
						await plugin.handlePrint(
							false,
							true,
						),
				);
		});
	}
}
