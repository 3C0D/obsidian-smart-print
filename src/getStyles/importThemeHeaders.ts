import { App, MarkdownView, TFile } from 'obsidian';
import { switchToLightTheme } from '../utils/themeSwitch.ts';
import { rgbToHex } from '../utils/colorUtils.ts';

const TEMP_HEADERS_MD = `# Header 1
## Header 2
### Header 3
#### Header 4
##### Header 5
###### Header 6`;

/**
 * Extracts heading and inline title colors from the current theme
 * by rendering a temporary file and reading computed DOM styles in light mode.
 * Much more reliable than CSS text parsing.
 */
export async function getThemeColors(app: App): Promise<{
	h1: string;
	h2: string;
	h3: string;
	h4: string;
	h5: string;
	h6: string;
	inlineTitle: string;
}> {
	const tmpDir = '_smart-print-tmp';
	const tempPath = `${tmpDir}/headers-${Date.now()}.md`;
	let tempFile: TFile | null = null;
	let leaf = app.workspace.getLeaf('tab');
	const restoreTheme = switchToLightTheme();

	try {
		// Create temp folder and file
		try {
			await app.vault.createFolder(tmpDir);
		} catch {
			// Folder may already exist
		}
		tempFile = await app.vault.create(tempPath, TEMP_HEADERS_MD);

		// Open the temp file in reading mode (preview)
		await leaf.openFile(tempFile, { state: { mode: 'preview' } });
		app.workspace.setActiveLeaf(leaf, { focus: true });

		// Wait for rendering
		await new Promise((resolve) => setTimeout(resolve, 1200));

		const view = leaf.view as MarkdownView;
		// Ensure reading mode
		await view.setState({ mode: 'preview' }, { history: false });
		await new Promise((resolve) => setTimeout(resolve, 500));

		const previewEl = view.contentEl.querySelector('.markdown-preview-view');

		const getColor = (selector: string): string => {
			const el = previewEl?.querySelector(selector);
			if (!el) return '#000000';
			return rgbToHex(window.getComputedStyle(el).color);
		};

		return {
			h1: getColor('h1'),
			h2: getColor('h2'),
			h3: getColor('h3'),
			h4: getColor('h4'),
			h5: getColor('h5'),
			h6: getColor('h6'),
			inlineTitle: getColor('.inline-title') || getColor('h1')
		};
	} finally {
		restoreTheme();
		if (leaf) leaf.detach();
		if (tempFile) {
			await app.vault.delete(tempFile);
			const folder = app.vault.getAbstractFileByPath(tmpDir);
			if (folder) {
				try {
					await app.vault.delete(folder);
				} catch {
					// Folder may not be empty or already deleted
				}
			}
		}
	}
}

/**
 * Gets all header colors from the current theme.
 * @deprecated Use getThemeColors instead for more reliable results.
 */
export function getHeaderColors(app: App): Map<number, string> {
	// This function is kept for backward compatibility but will return empty
	// if called synchronously. Use getThemeColors for async color extraction.
	console.warn('getHeaderColors is deprecated. Use getThemeColors instead.');
	return new Map();
}

/**
 * Gets the inline title color from the current theme.
 * @deprecated Use getThemeColors instead for more reliable results.
 */
export function getInlineTitleColor(app: App): string {
	console.warn('getInlineTitleColor is deprecated. Use getThemeColors instead.');
	return '#000000';
}
