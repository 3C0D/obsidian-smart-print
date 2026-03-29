/**
 * Converts an RGB color string to hexadecimal format.
 *
 * @param rgb - RGB color string (e.g., "rgb(255, 0, 0)" or "rgb(255 0 0)")
 * @returns Hex color string (e.g., "#ff0000")
 */
export function rgbToHex(rgb: string): string {
	const values = rgb.match(/\d+/g);
	if (!values) return '#000000';

	const r = parseInt(values[0]).toString(16).padStart(2, '0');
	const g = parseInt(values[1]).toString(16).padStart(2, '0');
	const b = parseInt(values[2]).toString(16).padStart(2, '0');

	return `#${r}${g}${b}`;
}
