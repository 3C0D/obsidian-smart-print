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
}

/**
 * Scans markdown content to detect various elements for adaptive UI.
 * Returns flags indicating presence of images, embeds, comments, metadata, and horizontal rules.
 *
 * @param vault - Obsidian vault instance for reading files
 * @param file - File to scan (optional)
 * @returns ContentFlags object with boolean flags for each content type
 */
export async function scanContentFlags(
	vault: Vault,
	file?: TFile,
): Promise<ContentFlags> {
	// Regex patterns for content detection
	const imagePattern =
		/!\[.*?\]\(.*?\)|!\[\[.*?\.(png|jpg|jpeg|gif|svg|webp|bmp)[^\]]+\]\]/i;
	const embedPattern = /!\[\[(?!.*\.(png|jpg|jpeg|gif|svg|webp|bmp))[^\]]+\]\]/i;

	if (!file) {
		return {
			hasImages: false,
			hasEmbeds: false,
			hasComments: false,
			hasMetadata: false,
			hasHrBreaks: false,
		};
	}

	const md = await vault.cachedRead(file);
	return {
		hasImages: imagePattern.test(md),
		hasEmbeds: embedPattern.test(md),
		hasComments: /%%[\s\S]+?%%/.test(md),
		hasMetadata: /^---[\s\S]+?---/.test(md),
		hasHrBreaks: /^[-*]{3,}\s*$/m.test(md.replace(/^---[\s\S]*?---\n?/, "")),
	};
}
