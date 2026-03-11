import { TFile, TFolder, Notice } from "obsidian";
import { generateHTML } from "./normalCapturePreview.ts";
import SmartPrintPlugin from "./main.ts";
import { ERROR_MESSAGES } from "./constants.ts";
import { isMobile } from "./utils/platform.ts";
import { openPrintModal } from "./basicPrint/basicPrintPreview.ts";
import {
	generatePrintStyles,
} from "./getStyles/generatePrintStyles.ts";
import { PrintManager } from "./browserPrintManager.ts";

/**
 * Gets the parent folder of the currently active file.
 * Returns null if the active file is in the vault root.
 *
 * @param plugin - SmartPrintPlugin instance
 * @returns Parent folder or null
 */
export async function getFolderByActiveFile(
	plugin: SmartPrintPlugin,
): Promise<TFolder | null> {
	const activeFile = plugin.app.workspace.getActiveFile();

	if (activeFile) {
		const parentFolder = activeFile.parent;

		// If file is in root folder, return null
		if (
			parentFolder instanceof TFolder &&
			!parentFolder.isRoot()
		) {
			return parentFolder;
		}
	}

	return null;
}

/**
 * Prints all markdown files in the specified folder
 * (or the active file's folder).
 *
 * Assembles all files into a single container, then routes
 * to the appropriate print engine:
 * - Mobile: always uses Electron/Printd (basic print)
 * - Desktop: uses browser print or Electron based on settings
 *
 * @param plugin - SmartPrintPlugin instance
 * @param folder - Optional folder, defaults to active file's folder
 */
export async function printFolder(
	plugin: SmartPrintPlugin,
	folder?: TFolder,
): Promise<void> {
	const activeFolder =
		folder || (await getFolderByActiveFile(plugin));
	if (!activeFolder) {
		new Notice(ERROR_MESSAGES.FOLDER_NOT_FOUND);
		return;
	}

	const files = activeFolder.children.filter(
		(file) =>
			file instanceof TFile && file.extension === "md",
	) as TFile[];

	if (files.length === 0) {
		new Notice(ERROR_MESSAGES.NO_MARKDOWN_FILES);
		return;
	}

	// Assemble all files into a single container
	const folderContent = createDiv();

	for (const file of files) {
		const content = await generateHTML(
			plugin.app,
			plugin.settings,
			file,
		);
		if (!content) {
			continue;
		}
		if (!plugin.settings.combineFolderNotes) {
			content.addClass("obsidian-print-page-break");
		}
		folderContent.append(content);
	}

	// Generate styles for printing
	const globalCSS = await generatePrintStyles(
		plugin.app,
		plugin.manifest,
		plugin.settings,
	);

	// Route to the appropriate print engine
	if (isMobile() || !plugin.settings.useBrowserPrint) {
		// Mobile or basic mode: use Electron/Printd preview
		await openPrintModal(
			folderContent,
			plugin.settings,
			globalCSS,
		);
	} else {
		// Desktop with browser print enabled
		const printer = new PrintManager();
		const html = printer.createPrintableHtml(
			folderContent,
			globalCSS,
			false,
			activeFolder.name,
		);
		await printer.browserPrint(html);
	}
}

