/**
 * Extracts and removes the first H1 from markdown content.
 * Returns the H1 text and the stripped content.
 */
export function extractFirstH1(markdown: string): {
	h1Text: string | null;
	stripped: string;
} {
	const match = markdown.match(/^#\s+(.+)/m);
	if (!match) return { h1Text: null, stripped: markdown };
	return {
		h1Text: match[1].trim(),
		stripped: markdown.replace(/^#\s+.+\n?/m, ""),
	};
}
