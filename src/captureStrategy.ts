import { App, MarkdownView, TFile } from 'obsidian';
import type { SmartPrintPluginSettings } from './types.ts';
import { getRenderedContent } from './advancedPrint/advancedCapturePreview.ts';
import { contentToHTML } from './normalCapturePreview.ts';
import { switchToLightTheme } from './utils/themeSwitch.ts';
import { inlineImages } from './utils/inlineImages.ts';

/**
 * Unified content capture strategy.
 * Tries advanced DOM capture first (most faithful), falls back to standard HTML generation.
 *
 * Advanced capture clones the live preview DOM, preserving rendered Mermaid diagrams,
 * Dataview queries, and other dynamic content. Standard capture uses Markdown rendering,
 * which is more reliable but doesn't capture dynamic plugin content.
 *
 * @param app - Obsidian App instance
 * @param settings - Plugin settings
 * @param isSelection - Whether to capture selection only
 * @param file - Optional specific file to capture
 * @returns Captured HTML element or null
 */
export async function getBestContent(
	app: App,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
	file?: TFile
): Promise<HTMLElement | null> {
	// Check if we can use advanced DOM capture.
	// Requirements:
	// 1. File must be currently active (DOM only exists for active preview)
	// 2. showComments must be disabled (comments are already stripped from DOM)
	const activeFile = app.workspace.getActiveFile();
	const isActiveFile = file ? file.path === activeFile?.path : true;
	const canUseAdvanced = isActiveFile && !settings.showComments;

	// Handle selection mode using temporary file approach for advanced capture.
	if (isSelection) {
		const { captureSelectionAdvanced } = await import('./utils/tempFileCapture.ts');
		const { isMobile } = await import('./utils/platform.ts');
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		const md = activeView?.editor.getSelection();
		const originalTitle = activeFile?.basename;
		if (md && canUseAdvanced && !isMobile()) {
			const content = await captureSelectionAdvanced(
				app,
				settings,
				md,
				originalTitle,
				true
			);
			if (content) {
				await inlineImages(content);
				return content;
			}
		}
		// Fallback to standard capture
		const content = await contentToHTML(app, settings, true, undefined);
		if (content) await inlineImages(content);
		return content;
	}

	if (!canUseAdvanced) {
		if (!settings.showComments) {
			const targetFile = file ?? activeFile;
			if (targetFile) {
				const { captureFromOpenLeaf } =
					await import('./utils/captureFromOpenLeaf.ts');
				const content = await captureFromOpenLeaf(
					app,
					settings,
					targetFile.path,
					true
				);
				if (content) {
					if (settings.debugMode)
						console.log('Capture from open leaf successful');
					await inlineImages(content);
					return content;
				}
			}
		}
		if (settings.debugMode) {
			console.log('File is not active, using standard renderer');
		}
		const content = await contentToHTML(app, settings, isSelection, file);
		if (content) await inlineImages(content);
		return content;
	}

	// Try advanced DOM capture first (most faithful rendering).
	// We temporarily switch to light theme because print output is typically
	// on white paper, and light theme colors are more suitable for printing.
	const restoreTheme = switchToLightTheme();
	try {
		if (settings.debugMode) {
			console.log('Attempting advanced DOM capture');
		}
		const content = await getRenderedContent(app, settings);
		if (content) {
			if (settings.debugMode) {
				console.log('Advanced DOM capture successful');
			}
			// Convert app:// protocol images to base64 for print compatibility
			await inlineImages(content);
			return content;
		}
	} catch (error) {
		if (settings.debugMode) {
			console.warn('Advanced DOM capture failed, falling back:', error);
		}
	} finally {
		// Always restore the original theme, even if capture fails.
		restoreTheme();
	}

	// Secondary fallback: try to capture from an already-open leaf.
	// Handles the case where focus shifted away from MarkdownView (e.g., file explorer click)
	// but the file is still open in another leaf.
	// Note: canUseAdvanced=true implies the file is active, so it must be in some leaf.
	const targetFile = file ?? activeFile;
	if (targetFile) {
		if (settings.debugMode) {
			console.log('Attempting capture from open leaf');
		}
		const { captureFromOpenLeaf } = await import('./utils/captureFromOpenLeaf.ts');
		const content = await captureFromOpenLeaf(app, settings, targetFile.path);
		if (content) {
			if (settings.debugMode) {
				console.log('Capture from open leaf successful');
			}
			await inlineImages(content);
			return content;
		}
	}

	// Last resort: standard HTML generation.
	// This uses Obsidian's MarkdownRenderer API, which is more reliable
	// but doesn't capture dynamic content from plugins.
	if (settings.debugMode) {
		console.log('Using standard HTML renderer');
	}
	const content = await contentToHTML(app, settings, isSelection, file);
	// Convert app:// protocol images to base64 for print compatibility
	if (content) await inlineImages(content);
	return content;
}

/**
 * Determines the best print engine based on platform and settings.
 *
 * Browser print creates a temporary HTML file and opens it in the system browser,
 * providing better text rendering and full browser print options.
 *
 * Printd uses Electron's print API (desktop) or mobile print dialog,
 * which is faster but has fewer options.
 *
 * @param settings - Plugin settings
 * @param isMobile - Whether running on mobile
 * @returns "browser" or "printd"
 */
export function getBestPrintEngine(
	settings: SmartPrintPluginSettings,
	isMobile: boolean
): 'browser' | 'printd' {
	// Mobile always uses Printd (no Node.js modules)
	if (isMobile) {
		return 'printd';
	}

	// Desktop: respect user preference
	return settings.useBrowserPrint ? 'browser' : 'printd';
}
