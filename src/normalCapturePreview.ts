import {
	MarkdownRenderer,
	TFile,
	Component,
	Notice,
	App,
	MarkdownView,
} from "obsidian";
import type { SmartPrintPluginSettings } from "./types.ts";

/**
 * Converts markdown content to HTML for printing
 * @param isSelection - Whether to print the selected text only (default: false)
 * @param file - TFile to print from (optional)
 */
export async function contentToHTML(
	app: App,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
	file?: TFile,
): Promise<HTMLElement | null> {
	if (isSelection) {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice("No active note.");
			return null;
		}

		const selection = activeView.editor.getSelection();
		if (!selection) {
			new Notice("No text selected.");
			return null;
		}

		return await generateHTML(app, settings, selection);
	} else {
		if (!file || file === app.workspace.getActiveFile()) {
			const activeView = app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				await activeView.save();
			}
			const activeFile = app.workspace.getActiveFile();
			if (activeFile) {
				file = activeFile;
			}
		}

		if (!file) {
			new Notice("No note to print.");
			return null;
		}

		return await generateHTML(app, settings, file);
	}
}

/**
 * Generates HTML content from markdown input.
 * Renders markdown using Obsidian's MarkdownRenderer API.
 * 
 * @param app - Obsidian App instance
 * @param settings - Plugin settings
 * @param input - TFile or markdown string to render
 * @returns Rendered HTML element or null
 */
export async function generateHTML(
	app: App,
	settings: SmartPrintPluginSettings,
	input: TFile | string,
): Promise<HTMLElement | null> {
	const content = createDiv("markdown-preview-view");

	try {
		const contentSizer = content.createDiv("markdown-preview-sizer");

		// Add metadata if enabled
		if (settings.showMetadata) {
			addMetadataToContent(input, contentSizer, app);
		}

		// Handle title if requested
		if (settings.printTitle && input instanceof TFile) {
			const titleEl = contentSizer.createEl("h1");
			titleEl.textContent = input.basename;
			titleEl.addClass("inline-title");
		}

		// Get the markdown content based on input type
		let markdownContent: string;
		let sourcePath: string;

		if (input instanceof TFile) {
			markdownContent = String(await app.vault.cachedRead(input));
			sourcePath = input.path;
		} else {
			markdownContent = String(input);
			sourcePath = app.workspace.getActiveFile()?.path ?? "";
		}

		// Strip frontmatter before rendering — Obsidian's frontmatter processor
		// rejects with boolean `true` when it encounters raw frontmatter in rendered content,
		// since we already handle metadata separately via addMetadataToContent.
		if (typeof markdownContent === "string") {
			markdownContent = markdownContent.replace(/^---[\s\S]*?---\n?/, "");
		}

		// Render the markdown content
		const component = new Component();
		component.load();
		try {
			await MarkdownRenderer.render(
				app,
				markdownContent,
				contentSizer,
				sourcePath,
				component,
			);
		} finally {
			component.unload();
		}

		return content;
	} catch (error) {
		new Notice("Failed to generate preview content.");
		console.error("Preview generation error:", error);
		return null;
	}
}

/**
 * Gets metadata from any input type
 */
function getMetadataFromInput(
	input: TFile | string,
	app: App,
): { metadata: any; file: TFile | null } {
	let file: TFile | null = null;
	let metadata = null;

	if (input instanceof TFile) {
		file = input;
	} else {
		file = app.workspace.getActiveFile();
	}

	if (file) {
		metadata = app.metadataCache.getFileCache(file)?.frontmatter;
	}

	return { metadata, file };
}

/**
 * Adds metadata content to the container
 */
function addMetadataToContent(
	input: TFile | string,
	container: HTMLElement,
	app: App,
): void {
	const { metadata } = getMetadataFromInput(input, app);

	if (metadata && Object.keys(metadata).length > 0) {
		const metadataContainer = container.createDiv(
			"custom-metadata-container",
		);
		const metadataContent = metadataContainer.createDiv(
			"custom-metadata-content",
		);
		Object.entries(metadata).forEach(([key, value]) => {
			const line = metadataContent.createDiv("custom-metadata-line");
			const displayValue = Array.isArray(value)
				? value.join(", ")
				: typeof value === "object" && value !== null
					? JSON.stringify(value)
					: String(value);
			line.setText(`${key}: ${displayValue}`);
		});
	}
}


