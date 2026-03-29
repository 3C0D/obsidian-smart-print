import { App, MarkdownView, TFile } from 'obsidian';
import type { SmartPrintPluginSettings } from '../types.ts';
import { getRenderedContent } from '../advancedPrint/advancedCapturePreview.ts';
import { switchToLightTheme } from './themeSwitch.ts';

/**
 * If the target file is already open in a leaf, temporarily activates it
 * and captures content via advanced DOM capture, then restores the original leaf.
 * Returns null if the file is not open in any leaf.
 */
export async function captureFromOpenLeaf(
	app: App,
	settings: SmartPrintPluginSettings,
	filePath: string,
	openIfNeeded: boolean = false // new param
): Promise<HTMLElement | null> {
	const originalLeaf = app.workspace.getMostRecentLeaf();
	let createdLeaf = false;

	let targetLeaf = app.workspace
		.getLeavesOfType('markdown')
		.find((leaf) => (leaf.view as MarkdownView).file?.path === filePath);

	if (!targetLeaf && openIfNeeded) {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		targetLeaf = app.workspace.getLeaf('tab');
		await targetLeaf.openFile(file);
		createdLeaf = true;
	}

	if (!targetLeaf) return null;

	app.workspace.setActiveLeaf(targetLeaf, { focus: true });

	// Poll until the view is actually active and matches the file
	await new Promise<void>((resolve) => {
		const check = setInterval(() => {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.file?.path === filePath) {
				clearInterval(check);
				resolve();
			}
		}, 50);
		setTimeout(() => {
			clearInterval(check);
			resolve();
		}, 3000);
	});

	const restoreTheme = switchToLightTheme();

	try {
		return await getRenderedContent(app, settings);
	} finally {
		restoreTheme();
		if (createdLeaf) targetLeaf.detach();
		else if (originalLeaf)
			app.workspace.setActiveLeaf(originalLeaf, { focus: false });
	}
}
