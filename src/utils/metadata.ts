import { App, TFile } from "obsidian";

/**
 * Renders metadata (frontmatter) as HTML elements.
 * Creates a styled container with key-value pairs.
 *
 * @param metadata - Frontmatter object from Obsidian's metadata cache
 * @param container - Parent element to insert metadata into
 */
export function renderMetadata(
	metadata: Record<string, any>,
	container: HTMLElement,
): void {
	if (!metadata || Object.keys(metadata).length === 0) {
		return;
	}

	const metadataContainer = container.createDiv("custom-metadata-container");
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

/**
 * Gets metadata from a file or the active file.
 *
 * @param app - Obsidian App instance
 * @param input - TFile or string (uses active file if string)
 * @returns Metadata object or null
 */
export function getMetadata(
	app: App,
	input: TFile | string,
): Record<string, any> | null {
	let file: TFile | null = null;

	if (input instanceof TFile) {
		file = input;
	} else {
		file = app.workspace.getActiveFile();
	}

	if (!file) return null;

	return app.metadataCache.getFileCache(file)?.frontmatter || null;
}
