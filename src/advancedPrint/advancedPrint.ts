import { App, type PluginManifest, Notice, MarkdownView } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import { generatePrintStyles } from "../getStyles/generatePrintStyles.ts";
import { PrintManager } from "../browserPrintManager.ts";
import { getRenderedContent } from "./advancedCapturePreview.ts";
import { ERROR_MESSAGES } from "../constants.ts";

/**
 * Advanced print mode: ensures accurate rendering of complex elements (Mermaid diagrams,
 * callouts, dynamic content) by capturing the fully rendered preview
 */
export async function advancedPrint(
	app: App,
	manifest: PluginManifest,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
): Promise<void> {
	try {
		const view = app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice(ERROR_MESSAGES.NO_ACTIVE_VIEW);
			return;
		}

		// Switch to light theme
		const wasInDarkMode = document.body.classList.contains("theme-dark");
		if (wasInDarkMode) {
			document.body.classList.replace("theme-dark", "theme-light");
		}

		try {
			const filePath = view.file?.path || "Untitled";

			// Get the HTML content from the rendered preview
			const renderedHtml = await getRenderedContent(
				app,
				settings,
				isSelection,
			);
			if (!renderedHtml) {
				throw new Error(ERROR_MESSAGES.PREVIEW_CAPTURE_FAILED);
			}

			// Generate styles
			const globalCss = await generatePrintStyles(
				app,
				manifest,
				settings,
			);

			// Print
			const printer = new PrintManager();
			await printer.browserPrint(
				printer.createPrintableHtml(
					renderedHtml,
					globalCss,
					true,
					filePath,
				),
			);
		} finally {
			// Restore theme
			if (wasInDarkMode) {
				document.body.classList.replace("theme-light", "theme-dark");
			}
		}
	} catch (error) {
		console.error("Advanced print error:", error);
		new Notice(ERROR_MESSAGES.PRINT_FAILED);
	}
}
