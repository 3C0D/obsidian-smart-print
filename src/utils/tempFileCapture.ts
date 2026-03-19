import { App, TFile } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import { getRenderedContent } from "../advancedPrint/advancedCapturePreview.ts";

/**
 * Renders selected markdown via advanced capture by creating a temporary file.
 * Creates temp file → opens in new leaf → captures DOM → closes and deletes.
 */
export async function captureSelectionAdvanced(
	app: App,
	settings: SmartPrintPluginSettings,
	markdownContent: string,
	originalTitle?: string,
	isSelection: boolean = false,
): Promise<HTMLElement | null> {
	const tmpDir = "_smart-print-tmp";
	try {
		await app.vault.createFolder(tmpDir);
	} catch {
		// Folder already exists
	}
	const tempPath = `${tmpDir}/temp-${Date.now()}.md`;
	let tempFile: TFile | null = null;
	let leaf = null;

	// Save original file reference before opening temp file
	const originalFile = app.workspace.getActiveFile();

	try {
		// Create temp file with selected content
		tempFile = await app.vault.create(tempPath, markdownContent);

		// Open in background leaf
		leaf = app.workspace.getLeaf("tab");
		await leaf.openFile(tempFile);
		app.workspace.setActiveLeaf(leaf, { focus: true });

		// Wait for initial render
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Capture using advanced mode (disable printTitle for temp file)
		const content = await getRenderedContent(app, {
			...settings,
			printTitle: false,
		});

		if (content) {
			// Remove temp file title injected by Obsidian
			content.querySelector(".inline-title")?.remove();

			// Inject original title if requested
			if (settings.printTitle && originalTitle) {
				const sizer = content.querySelector(".markdown-preview-sizer");
				if (sizer) {
					const titleEl = document.createElement("h1");
					titleEl.className = "inline-title";
					titleEl.textContent = originalTitle;
					sizer.insertBefore(titleEl, sizer.firstChild);
				}
			}

			// Inject metadata from original file (only for selection mode)
			if (
				content &&
				settings.showMetadata &&
				isSelection &&
				originalFile
			) {
				const { getMetadata, renderMetadata } =
					await import("./metadata.ts");
				const metadata = getMetadata(app, originalFile);
				if (metadata) {
					const sizer = content.querySelector(
						".markdown-preview-sizer",
					);
					if (sizer) {
						const tempDiv = document.createElement("div");
						renderMetadata(metadata, tempDiv);
						const inlineTitle = sizer.querySelector(".inline-title");
						const metaEl = tempDiv.firstChild as HTMLElement;
						if (inlineTitle) {
						inlineTitle.insertAdjacentElement("afterend", metaEl);
						} else {
						sizer.prepend(metaEl);
						}
					}
				}
			}
		}

		return content;
	} finally {
		// Always clean up
		if (leaf) leaf.detach();
		if (tempFile) {
			await app.vault.delete(tempFile);
			const tmpFolder =
				app.vault.getAbstractFileByPath("_smart-print-tmp");
			if (tmpFolder) {
				try {
					await app.vault.delete(tmpFolder);
				} catch {
					// Folder not empty, leave it
				}
			}
		}
	}
}
