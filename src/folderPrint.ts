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
import { PrintModeModal } from "./PrintModeModal.ts";

/**
 * Gets the parent folder of the currently active file.
 * Returns null if the active file is in the vault root.
 *
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
 * Flow:
 * 1. Find the target folder and filter for .md files.
 * 2. Generate HTML for each file using the standard Markdown renderer.
 * 3. Concatenate all files into a single master container.
 * 4. Apply a page-break class to separate files if 'combineFolderNotes' is false.
 * 5. Route to the correct print engine (Printd for mobile/basic, browser for desktop advanced).
 *
 * @param folder - Optional folder, defaults to active file's folder
 */
export async function printFolder(
	plugin: SmartPrintPlugin,
	folder?: TFolder,
): Promise<void> {
	// 1. Identify which folder to print
	const activeFolder =
		folder || (await getFolderByActiveFile(plugin));
	if (!activeFolder) {
		new Notice(ERROR_MESSAGES.FOLDER_NOT_FOUND);
		return;
	}

	// 2. Extract only Markdown files (.md extensions) from the folder's direct children
	// Note: Currently, this doesn't traverse subdirectories recursively.
	const files = activeFolder.children.filter(
		(file) =>
			file instanceof TFile && file.extension === "md",
	) as TFile[];

	if (files.length === 0) {
		new Notice(ERROR_MESSAGES.NO_MARKDOWN_FILES);
		return;
	}

	// 3. Show modal first if enabled
	if (plugin.settings.useFolderModal) {
		const proceed = await new Promise<boolean>((resolve) => {
			new PrintModeModal(
				plugin,
				plugin.app,
				plugin.settings,
				() => resolve(true),
				async () => await plugin.saveSettings(),
				true // isFolderPrint = true
			).open();
		});
		if (!proceed) return;
	}

	// 4. Assemble all files into a single master div container
	const folderContent = createDiv();

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		// Generate the standard HTML structure for a single file using Obsidian's API
		const content = await generateHTML(
			plugin.app,
			plugin.settings,
			file,
		);
		if (!content) {
			continue;
		}
		
		folderContent.append(content);
		
		// If combining notes is disabled, add a page break after each file (except the last one)
		if (!plugin.settings.combineFolderNotes && i < files.length - 1) {
			const pageBreak = folderContent.createEl("hr");
			pageBreak.style.pageBreakBefore = "always";
			pageBreak.style.border = "none";
			pageBreak.style.margin = "0";
			pageBreak.style.visibility = "hidden";
		}
	}

	// 5. Generate global styles for printing (theme colors, headings, fonts)
	const globalCSS = await generatePrintStyles(
		plugin.app,
		plugin.manifest,
		plugin.settings,
	);

	// 6. Route to the appropriate print engine
	// Since rendering Node modules like 'fs' or 'child_process' is impossible on mobile,
	// mobile *must* use the basic Printd engine unconditionally.
	if (isMobile() || !plugin.settings.useBrowserPrint) {
		// Mobile or basic mode: use Electron/Printd in-app preview
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

