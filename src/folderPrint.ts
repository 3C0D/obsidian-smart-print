import { TFile, TFolder, Notice } from "obsidian";
import { generateHTML } from "./normalCapturePreview.ts";
import { captureSelectionAdvanced } from "./utils/tempFileCapture.ts";
import SmartPrintPlugin from "./main.ts";
import { ERROR_MESSAGES } from "./constants.ts";
import { isMobile } from "./utils/platform.ts";
import { openPrintModal } from "./basicPrint/basicPrintPreview.ts";
import { generatePrintStyles } from "./getStyles/generatePrintStyles.ts";
import { PrintManager } from "./browserPrintManager.ts";
import { PrintModeModal } from "./PrintModeModal.ts";

/**
 * Gets the parent folder of the currently active file.
 * Returns null if the active file is in the vault root.
 *
 * This is used when printing a folder via command palette,
 * where we need to determine which folder to print based on
 * the currently open file's location.
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
		if (parentFolder instanceof TFolder && !parentFolder.isRoot()) {
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
 * 2. Show options modal if enabled (allows user to adjust settings).
 * 3. Generate HTML for each file using the standard Markdown renderer.
 * 4. Concatenate all files into a single master container.
 * 5. Apply invisible page breaks between files if 'combineFolderNotes' is false.
 * 6. Route to the correct print engine (Printd for mobile/basic, browser for desktop advanced).
 *
 * Note: Currently only processes direct children, not subdirectories recursively.
 *
 * @param plugin - SmartPrintPlugin instance
 * @param folder - Optional folder, defaults to active file's folder
 */
export async function printFolder(
	plugin: SmartPrintPlugin,
	folder?: TFolder,
): Promise<void> {
	// 1. Identify which folder to print.
	// If no folder is provided (e.g., from command palette),
	// use the parent folder of the currently active file.
	const activeFolder = folder || (await getFolderByActiveFile(plugin));
	if (!activeFolder) {
		new Notice(ERROR_MESSAGES.FOLDER_NOT_FOUND);
		return;
	}

	// 2. Extract only Markdown files (.md extensions) from the folder's direct children.
	// Note: This doesn't traverse subdirectories recursively.
	// Non-markdown files (images, PDFs, etc.) are automatically excluded.
	const files = activeFolder.children.filter(
		(file) => file instanceof TFile && file.extension === "md",
	) as TFile[];

	if (files.length === 0) {
		new Notice(ERROR_MESSAGES.NO_MARKDOWN_FILES);
		return;
	}

	// 3. Show options modal if enabled in settings.
	// This allows users to adjust print settings (fonts, colors, etc.)
	// before printing the entire folder.
	if (plugin.settings.useFolderModal) {
		const proceed = await new Promise<boolean>((resolve) => {
			new PrintModeModal(
				plugin,
				plugin.app,
				plugin.settings,
				() => resolve(true),
				async () => await plugin.saveSettings(),
				true, // isFolderPrint = true
				false, // isSelection = false
				{
					hasImages: true,
					hasEmbeds: true,
					hasComments: true,
					hasMetadata: true,
					hasHrBreaks: true,
				}, // contentFlags
				"Print Folder", // modalTitle
			).open();
		});
		if (!proceed) return;
	}

	// 4. Assemble all files into a single master div container.
	// Each file is rendered separately and then appended to this container.
	const folderContent = createDiv();

	// Show notice for large folder prints using advanced mode
	if (!isMobile() && files.length > 3) {
		new Notice(
			`Rendering ${files.length} files with advanced mode, please wait...`,
		);
	}

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		// Use advanced rendering on desktop, basic rendering on mobile
		const markdownContent = await plugin.app.vault.cachedRead(file);
		const content = isMobile()
			? await generateHTML(plugin.app, plugin.settings, file)
			: await captureSelectionAdvanced(
					plugin.app,
					plugin.settings,
					markdownContent,
					file.basename,
				);
		if (!content) {
			continue;
		}

		folderContent.append(content);

		// If combining notes is disabled, add an invisible page break after each file.
		// This ensures each note starts on a new page when printed.
		// The <hr> is hidden but triggers page-break-before in CSS.
		if (!plugin.settings.combineFolderNotes && i < files.length - 1) {
			const pageBreak = folderContent.createEl("hr");
			pageBreak.style.pageBreakBefore = "always";
			pageBreak.style.border = "none";
			pageBreak.style.margin = "0";
			pageBreak.style.visibility = "hidden";
		}
	}

	// 5. Generate global styles for printing (theme colors, headings, fonts).
	// This includes user's custom settings and optional CSS snippets.
	const globalCSS = await generatePrintStyles(
		plugin.app,
		plugin.manifest,
		plugin.settings,
	);

	// 6. Route to the appropriate print engine.
	// Mobile must use Printd because Node.js modules (fs, child_process) don't exist.
	// Desktop can choose between browser print (better rendering) or Printd (faster).
	if (isMobile() || !plugin.settings.useBrowserPrint) {
		// Mobile or basic mode: use Electron/Printd in-app preview
		await openPrintModal(folderContent, plugin.settings, globalCSS);
	} else {
		// Desktop with browser print enabled: create temp HTML file and open in browser
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
