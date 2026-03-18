import { App, MarkdownView } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import { getRenderedContent } from "../advancedPrint/advancedCapturePreview.ts";
import { switchToLightTheme } from "./themeSwitch.ts";

/**
 * If the target file is already open in a leaf, temporarily activates it
 * and captures content via advanced DOM capture, then restores the original leaf.
 * Returns null if the file is not open in any leaf.
 */
export async function captureFromOpenLeaf(
	app: App,
	settings: SmartPrintPluginSettings,
	filePath: string,
): Promise<HTMLElement | null> {
	const originalLeaf = app.workspace.getMostRecentLeaf();

	const targetLeaf = app.workspace
		.getLeavesOfType("markdown")
		.find((leaf) => (leaf.view as MarkdownView).file?.path === filePath);

	if (!targetLeaf) return null;

	app.workspace.setActiveLeaf(targetLeaf, { focus: true });
	const restoreTheme = switchToLightTheme();

	try {
		return await getRenderedContent(app, settings);
	} finally {
		restoreTheme();
		if (originalLeaf) {
			app.workspace.setActiveLeaf(originalLeaf, { focus: false });
		}
	}
}
