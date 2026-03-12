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
 * Removes artifact nodes produced by Obsidian internal processors.
 * Some processors write "true" or "false" as text or bare element nodes.
 */
function removeArtifactNodes(el: HTMLElement): void {
	const toRemove: ChildNode[] = [];
	el.childNodes.forEach((node) => {
		const text = node.textContent?.trim() ?? "";
		const isArtifact = text === "true" || text === "false";
		const isLeaf =
			node.nodeType === Node.TEXT_NODE ||
			(node instanceof HTMLElement && node.children.length === 0);
		if (isArtifact && isLeaf) {
			toRemove.push(node);
		}
	});
	toRemove.forEach((n) => el.removeChild(n));
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

		// Must be attached to DOM for Obsidian processors to work correctly
		const renderTarget = createDiv();
		renderTarget.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:800px;";
		document.body.appendChild(renderTarget);

		try {
			try {
				await MarkdownRenderer.render(
					app,
					markdownContent,
					renderTarget,
					sourcePath,
					component,
				);
			} catch (e) {
				if (settings.debugMode) {
					console.warn("MarkdownRenderer threw:", e);
					console.log("renderTarget content after throw:", renderTarget.innerHTML);
				}
			}

			// If renderer produced nothing, retry without app context (simpler render)
			// This handles cases where a plugin processor throws before writing content
			if (renderTarget.childNodes.length === 0) {
				try {
					await MarkdownRenderer.render(
						app,
						markdownContent,
						renderTarget,
						"",  // empty sourcePath disables some problematic processors
						component,
					);
				} catch (e) {
					if (settings.debugMode) {
						console.warn("Fallback render also threw:", e);
					}
				}
			}

			// Last resort: plain text if still nothing
			if (renderTarget.childNodes.length === 0) {
				renderTarget.createEl("p").textContent = markdownContent;
			}

			// Remove artifact nodes: Obsidian processors sometimes write "true"/"false"
			// as text nodes or bare elements when processing partial/stripped content
			removeArtifactNodes(renderTarget);

			// Move cleaned children to contentSizer
			while (renderTarget.firstChild) {
				contentSizer.appendChild(renderTarget.firstChild);
			}
		} finally {
			component.unload();
			if (renderTarget.parentNode) {
				document.body.removeChild(renderTarget);
			}
		};

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


