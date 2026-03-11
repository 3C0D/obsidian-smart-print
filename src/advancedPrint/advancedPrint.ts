import {
	App,
	type PluginManifest,
	Notice,
	MarkdownView,
} from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import {
	generatePrintStyles,
} from "../getStyles/generatePrintStyles.ts";
import { PrintManager } from "../browserPrintManager.ts";
import {
	getRenderedContent,
} from "./advancedCapturePreview.ts";
import { ERROR_MESSAGES } from "../constants.ts";
import {
	switchToLightTheme,
} from "../utils/themeSwitch.ts";

/**
 * Advanced print mode: ensures accurate rendering of
 * complex elements (Mermaid diagrams, callouts, dynamic
 * content) by capturing the fully rendered preview DOM
 * and opening it in the system browser.
 *
 * Desktop only — uses browser print via temp file.
 *
 * @param app - Obsidian App instance
 * @param manifest - Plugin manifest
 * @param settings - Current plugin settings
 * @param isSelection - Print selected text only
 */
export async function advancedPrint(
	app: App,
	manifest: PluginManifest,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
): Promise<void> {
	try {
		const view =
			app.workspace.getActiveViewOfType(
				MarkdownView,
			);
		if (!view) {
			new Notice(ERROR_MESSAGES.NO_ACTIVE_VIEW);
			return;
		}

		// Switch to light theme for print rendering
		const restoreTheme = switchToLightTheme();

		try {
			const filePath =
				view.file?.path || "Untitled";

			// Capture the fully rendered preview DOM
			const renderedHtml =
				await getRenderedContent(
					app,
					settings,
					isSelection,
				);
			if (!renderedHtml) {
				throw new Error(
					ERROR_MESSAGES.PREVIEW_CAPTURE_FAILED,
				);
			}

			// Generate styles
			const globalCss =
				await generatePrintStyles(
					app,
					manifest,
					settings,
				);

			// Print via browser
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
			restoreTheme();
		}
	} catch (error) {
		console.error("Advanced print error:", error);
		new Notice(ERROR_MESSAGES.PRINT_FAILED);
	}
}

