import { App, Notice, type PluginManifest } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import { FONT_OPTIONS } from "./fontOptions.ts";
import { ERROR_MESSAGES } from "../constants.ts";

/**
 * Generates CSS styles for printing by combining:
 * - Plugin base styles (styles.css)
 * - User custom print snippet (print.css)
 * - Dynamic settings (font, headings, colors, etc.)
 *
 * @param app - Obsidian App instance
 * @param manifest - Plugin manifest (for locating styles.css)
 * @param settings - Current plugin settings
 * @returns Combined CSS string ready for injection
 */
export async function generatePrintStyles(
	app: App,
	manifest: PluginManifest,
	settings: SmartPrintPluginSettings,
): Promise<string> {
	const adapter = app.vault.adapter;

	// Read plugin stylesheet
	let pluginStyle = "";
	if (manifest.dir) {
		// Use string interpolation instead of Node.js path.join()
		// Obsidian vault paths always use forward slashes
		const cssPath = `${manifest.dir}/styles.css`;
		try {
			pluginStyle = await adapter.read(cssPath);
		} catch {
			new Notice(ERROR_MESSAGES.STYLE_NOT_FOUND);
		}
	} else {
		new Notice(ERROR_MESSAGES.PLUGIN_PATH_NOT_FOUND);
	}

	// Read user print stylesheet (optional)
	const userStyle =
		getPrintSnippet(app) && isPrintSnippetEnabled(app)
			? (getPrintSnippetValue(app) ?? "")
			: "";

	// Generate CSS for headings with sizes and colors from settings
	const titleCSS = settings.printTitle
		? `
.obsidian-print .inline-title {
    display: block;
    font-size: ${settings.inlineTitleSize};
    color: ${settings.inlineTitleColor};
}`
		: `
.obsidian-print .inline-title {
    display: none;
}`;

	const headingsCSS = ["h1", "h2", "h3", "h4", "h5", "h6"]
		.map((tag) => {
			const sizeKey = `${tag}Size` as keyof SmartPrintPluginSettings;
			const colorKey = `${tag}Color` as keyof SmartPrintPluginSettings;
			return (
				`.obsidian-print ${tag} {` +
				` font-size: ${settings[sizeKey]};` +
				` color: ${settings[colorKey]}; }`
			);
		})
		.join("\n");

	// Black & white override: disable all colors
	const bwCSS = !settings.printInColor
		? `
.obsidian-print,
.obsidian-print * {
    color: black !important;
}
.obsidian-print .inline-title {
    color: black !important;
}
.obsidian-print h1, .obsidian-print h2,
.obsidian-print h3, .obsidian-print h4,
.obsidian-print h5, .obsidian-print h6 {
    color: black !important;
}
.obsidian-print mark {
    background-color: #e0e0e0 !important;
}
.obsidian-print .callout {
    border-color: #999 !important;
    background-color: white !important;
}
.obsidian-print .callout-title {
    background-color: #f0f0f0 !important;
    color: black !important;
}
.obsidian-print svg *[fill]:not([fill="none"]) {
    fill: black !important;
}
.obsidian-print svg *[stroke]:not([stroke="none"]) {
    stroke: black !important;
}
`
		: "";

	const fontFamily = getFontFamily(settings.printFontFamily);

	const hrCSS = settings.hrPageBreaks
		? ".obsidian-print hr {" +
			" page-break-before: always;" +
			" border: none; }"
		: "";

	const metaCSS = !settings.showMetadata
		? ".obsidian-print .metadata-container" +
			" { display: none; }"
		: "";

	const hideImagesCSS = settings.hideImages
		? ".obsidian-print img { display: none; }"
		: "";

	// Final combined CSS
	return `
.obsidian-print {
    font-size: ${settings.fontSize};
    font-family: ${fontFamily};
}
${titleCSS}
${headingsCSS}
${hrCSS}
${metaCSS}
${hideImagesCSS}
${pluginStyle}
${userStyle}
${bwCSS}
    `;
}

/**
 * Returns the CSS font-family declaration for a
 * given font key from FONT_OPTIONS.
 */
export function getFontFamily(fontKey?: string): string {
	const fontOption = FONT_OPTIONS.find((font) => font.value === fontKey);
	return fontOption?.css || FONT_OPTIONS[0].css;
}

function getPrintSnippetValue(app: App): string | undefined {
	const printCssPath = ".obsidian/snippets/print.css";
	return app.customCss.csscache.get(printCssPath);
}

export function isPrintSnippetEnabled(app: App): boolean {
	return app.customCss.enabledSnippets.has("print");
}

export function getPrintSnippet(app: App): boolean {
	return app.customCss.snippets.contains("print");
}
