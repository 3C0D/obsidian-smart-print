import { App, TFile, Notice, MarkdownView, MarkdownRenderer, Component } from "obsidian";
import type { SmartPrintPluginSettings } from "./types.ts";
import { getRenderedContent } from "./advancedPrint/advancedCapturePreview.ts";
import { contentToHTML } from "./normalCapturePreview.ts";
import { switchToLightTheme } from "./utils/themeSwitch.ts";

/**
 * Unified content capture strategy.
 * Tries advanced DOM capture first (most faithful), falls back to standard HTML generation.
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
	file?: TFile,
): Promise<HTMLElement | null> {
	if (isSelection) {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return null;
		
		const selection = activeView.editor.getSelection();
		if (!selection) {
			new Notice("No text selected.");
			return null;
		}

		// For selections, render directly without complex pipeline
		// MarkdownRenderer throws on partial content with certain processors
		const container = document.createElement("div");
		container.className = "markdown-preview-view";
		const sizer = container.createDiv("markdown-preview-sizer");
		
		const component = new Component();
		component.load();
		try {
			await MarkdownRenderer.render(
				app,
				selection,
				sizer,
				activeView.file?.path ?? "",
				component,
			);
		} catch {
			// If render fails, split into paragraphs as plain fallback
			sizer.empty();
			selection.split("\n\n").filter(Boolean).forEach((para) => {
				sizer.createEl("p").textContent = para;
			});
		}
		component.unload();
		return container as HTMLElement;
	}

	// Check if we can use advanced capture
	// Only works for active file (DOM capture requires preview to be open)
	const activeFile = app.workspace.getActiveFile();
	const canUseAdvanced = !file || file.path === activeFile?.path;

	if (!canUseAdvanced) {
		if (settings.debugMode) {
			console.log("File is not active, using standard renderer");
		}
		return await contentToHTML(app, settings, isSelection, file);
	}

	// Try advanced DOM capture first (most faithful rendering)
	const restoreTheme = switchToLightTheme();
	try {
		if (settings.debugMode) {
			console.log("Attempting advanced DOM capture");
		}
		const content = await getRenderedContent(app, settings, isSelection);
		if (content) {
			if (settings.debugMode) {
				console.log("Advanced DOM capture successful");
			}
			return content;
		}
	} catch (error) {
		if (settings.debugMode) {
			console.warn("Advanced DOM capture failed, falling back to standard:", error);
		}
	} finally {
		restoreTheme();
	}

	// Fallback to standard HTML generation
	if (settings.debugMode) {
		console.log("Using standard HTML renderer");
	}
	return await contentToHTML(app, settings, isSelection, file);
}

/**
 * Determines the best print engine based on platform and settings.
 * 
 * @param settings - Plugin settings
 * @param isMobile - Whether running on mobile
 * @returns "browser" or "printd"
 */
export function getBestPrintEngine(
	settings: SmartPrintPluginSettings,
	isMobile: boolean,
): "browser" | "printd" {
	// Mobile always uses Printd (no Node.js modules)
	if (isMobile) {
		return "printd";
	}

	// Desktop: respect user preference
	return settings.useBrowserPrint ? "browser" : "printd";
}
