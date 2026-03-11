/**
 * Temporarily switches Obsidian to light theme
 * for print rendering. Printing always uses light
 * theme since paper is white.
 *
 * @returns A restore function — call it when done
 *          to switch back to dark theme if needed.
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
	const wasInDarkMode =
		document.body.classList.contains("theme-dark");

	if (wasInDarkMode) {
		document.body.classList.replace(
			"theme-dark",
			"theme-light",
		);
	}

	return () => {
		if (wasInDarkMode) {
			document.body.classList.replace(
				"theme-light",
				"theme-dark",
			);
		}
	};
}
