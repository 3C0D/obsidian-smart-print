import type { TFile, Vault } from "obsidian";

/**
 * Flags indicating presence of various content types in a markdown file.
 * Used for adaptive UI in print modal.
 */
export interface ContentFlags {
	hasImages: boolean;
	hasEmbeds: boolean;
	hasComments: boolean;
	hasMetadata: boolean;
	hasHrBreaks: boolean;
	hasH1: boolean;
}

/**
 * Scans markdown content to detect various elements for adaptive UI.
 * Returns flags indicating presence of images, embeds, comments, metadata, and horizontal rules.
 *
 * @param vault - Obsidian vault instance for reading files
 * @param file - File to scan (optional)
 * @param content - Raw markdown content for selections (optional, used when no file is available)
 * @returns ContentFlags object with boolean flags for each content type
 */
export async function scanContentFlags(
	vault: Vault,
	file?: TFile,
	content?: string,
): Promise<ContentFlags> {
	// Regex patterns for content detection
	const imagePattern =
		/!\[.*?\]\(.*?\)|!\[\[.*?\.(png|jpg|jpeg|gif|svg|webp|bmp)[^\]]+\]\]/i;
	const embedPattern =
		/!\[\[(?!.*\.(png|jpg|jpeg|gif|svg|webp|bmp))[^\]]+\]\]/i;

	// For selections, use provided content directly without filename comparison
	if (content !== undefined) {
		return {
			hasImages: imagePattern.test(content),
			hasEmbeds: embedPattern.test(content),
			hasComments: /%%[\s\S]+?%%/.test(content),
			hasMetadata: /^---[\s\S]+?---/.test(content),
			hasHrBreaks: /^[-*]{3,}\s*$/m.test(
				content.replace(/^---[\s\S]*?---\n?/, ""),
			),
			hasH1: /^#\s+.+/m.test(content),
		};
	}

	if (!file) {
		return {
			hasImages: false,
			hasEmbeds: false,
			hasComments: false,
			hasMetadata: false,
			hasHrBreaks: false,
			hasH1: false,
		};
	}

	const md = await vault.cachedRead(file);
	const h1Match = md.match(/^#\s+(.+)/m);
	return {
		hasImages: imagePattern.test(md),
		hasEmbeds: embedPattern.test(md),
		hasComments: /%%[\s\S]+?%%/.test(md),
		hasMetadata: /^---[\s\S]+?---/.test(md),
		hasHrBreaks: /^[-*]{3,}\s*$/m.test(
			md.replace(/^---[\s\S]*?---\n?/, ""),
		),
		hasH1: h1Match
			? h1Match[1].trim().toLowerCase() !== file.basename.toLowerCase()
			: false,
	};
}
