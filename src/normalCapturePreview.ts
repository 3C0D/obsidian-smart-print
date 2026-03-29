import { MarkdownRenderer, TFile, Component, Notice, App, MarkdownView } from 'obsidian';
import type { SmartPrintPluginSettings } from './types.ts';
import { getMetadata, renderMetadata } from './utils/metadata.ts';
import { extractFirstH1 } from './utils/h1Utils.ts';

/**
 * Converts markdown content to HTML for printing.
 * Uses Obsidian's MarkdownRenderer API for reliable rendering.
 *
 * This is the "standard" capture method that works for any file,
 * even if it's not currently open. However, it doesn't capture
 * dynamic content from plugins (Mermaid, Dataview, etc.).
 *
 * @param app - Obsidian App instance
 * @param settings - Plugin settings
 * @param isSelection - Whether to print the selected text only (default: false)
 * @param file - TFile to print from (optional)
 * @returns Rendered HTML element or null
 */
export async function contentToHTML(
	app: App,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
	file?: TFile
): Promise<HTMLElement | null> {
	if (isSelection) {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) {
			new Notice('No active note.');
			return null;
		}

		const selection = activeView.editor.getSelection();
		if (!selection) {
			new Notice('No text selected.');
			return null;
		}

		return await generateHTML(app, settings, selection);
	} else {
		// Get the active file once to avoid multiple calls
		const activeFile = app.workspace.getActiveFile();

		// If the target file is the active file (or no file specified),
		// save it first to ensure we're printing the latest content
		if (!file || file === activeFile) {
			const activeView = app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				await activeView.save();
			}
			// If no file was specified, use the active file
			if (!file) {
				file = activeFile ?? undefined;
			}
		}

		if (!file) {
			new Notice('No note to print.');
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
	input: TFile | string
): Promise<HTMLElement | null> {
	const content = createDiv('markdown-preview-view');

	try {
		const contentSizer = content.createDiv('markdown-preview-sizer');

		// Get the markdown content first (needed before title block)
		let markdownContent: string;
		let sourcePath: string;

		if (input instanceof TFile) {
			markdownContent = String(await app.vault.cachedRead(input));
			sourcePath = input.path;
		} else {
			markdownContent = String(input);
			sourcePath = app.workspace.getActiveFile()?.path ?? '';
		}

		// Store title for later comparison if needed
		const titleText =
			input instanceof TFile ? input.basename.toLowerCase().trim() : '';

		// Handle title if requested
		if (settings.printTitle && input instanceof TFile) {
			const titleEl = contentSizer.createEl('h1');
			titleEl.addClass('inline-title');

			if (settings.replaceTitleWithH1) {
				// Extract first H1 from markdown before rendering
				const { h1Text, stripped } = extractFirstH1(markdownContent);
				titleEl.textContent = h1Text ?? input.basename;
				if (h1Text) markdownContent = stripped;
			} else {
				titleEl.textContent = input.basename;
			}
		}

		// Add metadata if enabled
		if (settings.showMetadata) {
			const metadata = getMetadata(app, input);
			if (metadata) {
				renderMetadata(metadata, contentSizer);
			}
		}

		// Strip frontmatter before rendering.
		// Why: Obsidian's MarkdownRenderer rejects raw frontmatter with a boolean error
		// because frontmatter should be processed separately (we handle it via addMetadataToContent).
		// This prevents rendering errors while preserving metadata display when enabled.
		if (typeof markdownContent === 'string') {
			markdownContent = markdownContent.replace(/^---[\s\S]*?---\n?/, '');
		}

		// Remove text embeds (![[note]]) when hideEmbeds is enabled.
		// MarkdownRenderer does not render transclusions, so CSS cannot target them.
		// We strip them from the source before rendering instead.
		if (settings.hideEmbeds) {
			markdownContent = markdownContent.replace(
				/!\[\[(?!.*\.(png|jpg|jpeg|gif|svg|webp|bmp))[^\]]+\]\]/gi,
				''
			);
		}

		// Convert Obsidian comments (%% ... %%) to inline code placeholders.
		// Why: We use markdown code syntax (`text`) because HTML is escaped by the renderer.
		// After rendering, we'll convert these back to styled spans with yellow background.
		if (settings.showComments) {
			markdownContent = markdownContent.replace(
				/%%(.+?)%%/gs,
				(_, content) => `\`[comment: ${content.trim()}]\``
			);
		}

		// Render the markdown content using Obsidian's API.
		// We create a temporary Component to manage the lifecycle of any
		// embedded components (like code blocks with syntax highlighting).
		const component = new Component();
		component.load();
		try {
			await MarkdownRenderer.render(
				app,
				markdownContent,
				contentSizer,
				sourcePath,
				component
			);
		} finally {
			// Always unload the component to prevent memory leaks.
			component.unload();
		}

		// Post-processing: Convert code placeholders to styled comment spans.
		// We replace the `<code>[comment: ...]</code>` elements created by the
		// renderer with styled spans that have a yellow background.
		if (settings.showComments) {
			contentSizer.querySelectorAll('code').forEach((code) => {
				if (code.textContent?.startsWith('[comment: ')) {
					const span = document.createElement('span');
					span.className = 'obsidian-comment';
					span.textContent = code.textContent
						.replace('[comment: ', '')
						.replace(/\]$/, '');
					code.replaceWith(span);
				}
			});
		}

		// Remove duplicate H1 if it matches the inline title.
		// Why: When printTitle is enabled, we add an inline title at the top.
		// If the note's first heading is identical to the filename, it's redundant,
		// so we remove it to avoid duplication.
		// Note: Skip this if replaceTitleWithH1 is active, as H1 is already removed before rendering.
		if (
			settings.printTitle &&
			input instanceof TFile &&
			!settings.replaceTitleWithH1
		) {
			const firstH1 = contentSizer.querySelector('h1:not(.inline-title)');
			if (firstH1 && firstH1.textContent?.toLowerCase().trim() === titleText) {
				firstH1.remove();
			}
		}

		return content;
	} catch (error) {
		new Notice('Failed to generate preview content.');
		console.error('Preview generation error:', error);
		return null;
	}
}
