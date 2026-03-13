/**
 * Helper function to create a checkbox with label.
 * Reduces duplication in modal UI code.
 *
 * @param container - Parent HTML element to append checkbox to
 * @param labelText - Text to display next to checkbox
 * @param title - Tooltip text on hover
 * @param checked - Initial checked state
 * @param onChange - Async callback when checkbox state changes
 */
export function createCheckbox(
	container: HTMLElement,
	labelText: string,
	title: string,
	checked: boolean,
	onChange: (checked: boolean) => Promise<void>,
): void {
	const label = container.createEl("label");
	const checkbox = label.createEl("input", { type: "checkbox" });
	checkbox.checked = checked;
	label.appendText(labelText);
	label.title = title;
	checkbox.addEventListener("change", async () => {
		await onChange(checkbox.checked);
	});
}
