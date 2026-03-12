import { App, TFile } from "obsidian";
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
	// For selections, advanced mode is currently broken
	// Fall back to standard renderer
	if (isSelection) {
		if (settings.debugMode) {
			console.log("Selection mode: using standard renderer");
		}
		return await contentToHTML(app, settings, isSelection, file);
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
