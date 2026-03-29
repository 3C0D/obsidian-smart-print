/**
 * Temporarily switches Obsidian to light theme for print rendering.
 *
 * Why: Print output is typically on white paper, so light theme colors
 * are more appropriate than dark theme colors. This ensures headings,
 * text, and UI elements have suitable contrast for printing.
 *
 * The function returns a restore callback that should be called in a
 * finally block to ensure the theme is restored even if an error occurs.
 *
 * @returns A restore function — call it when done to switch back to dark theme if needed.
 *
 * @example
 * ```ts
 * const restore = switchToLightTheme();
 * try {
 *     // ... do print work in light theme ...
 * } finally {
 *     restore();
 * }
 * ```
 */
export function switchToLightTheme(): () => void {
	const wasInDarkMode = document.body.classList.contains('theme-dark');

	if (wasInDarkMode) {
		document.body.classList.replace('theme-dark', 'theme-light');
	}

	return () => {
		if (wasInDarkMode) {
			document.body.classList.replace('theme-light', 'theme-dark');
		}
	};
}
