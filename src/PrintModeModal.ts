import { Modal, App } from "obsidian";
import type { SmartPrintPluginSettings } from "./types.ts";
import {
	validateFontSize,
	initializeFontSizes,
} from "./settings.ts";
import type SmartPrintPlugin from "./main.ts";
import { FONT_OPTIONS } from "./getStyles/fontOptions.ts";

/**
 * Simplified print options modal.
 * No longer asks for print mode - uses unified capture strategy.
 * Only shows user-facing options: title, metadata, colors, fonts.
 */
export class PrintModeModal extends Modal {
	constructor(
		private plugin: SmartPrintPlugin,
		app: App,
		private settings: SmartPrintPluginSettings,
		private onSubmit: () => void,
		private saveSettings: () => Promise<void>,
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;

		// Set modal size
		this.modalEl.style.width = "500px";
		this.modalEl.style.height = "280px";

		contentEl.empty();
		contentEl.createEl("h2", { text: "Print Options" });

		this.renderOptionsRow(contentEl);
		this.renderFontRow(contentEl);
		this.renderButtons(contentEl);
	}

	/**
	 * Renders the first row: checkboxes for quick options
	 */
	private renderOptionsRow(
		contentEl: HTMLElement,
	): void {
		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.justifyContent = "center";
		container.style.gap = "20px";
		container.style.marginBottom = "15px";

		// Print title checkbox
		const titleLabel = container.createEl("label");
		const titleCheck = titleLabel.createEl("input", {
			type: "checkbox",
		});
		titleCheck.checked = this.settings.printTitle;
		titleLabel.appendText(" Print Title");
		titleCheck.addEventListener(
			"change",
			async () => {
				this.settings.printTitle =
					titleCheck.checked;
				await this.saveSettings();
			},
		);

		// Metadata checkbox
		const metaLabel = container.createEl("label");
		const metaCheck = metaLabel.createEl("input", {
			type: "checkbox",
		});
		metaCheck.checked = this.settings.showMetadata;
		metaLabel.appendText(" Show Metadata");
		metaCheck.addEventListener(
			"change",
			async () => {
				this.settings.showMetadata =
					metaCheck.checked;
				await this.saveSettings();
			},
		);

		// Page breaks checkbox
		const breaksLabel = container.createEl("label");
		const breaksCheck = breaksLabel.createEl("input", {
			type: "checkbox",
		});
		breaksCheck.checked = this.settings.hrPageBreaks;
		breaksLabel.appendText(" Page Breaks at HR");
		breaksCheck.addEventListener(
			"change",
			async () => {
				this.settings.hrPageBreaks =
					breaksCheck.checked;
				await this.saveSettings();
			},
		);

		// Print in color checkbox
		const colorLabel = container.createEl("label");
		const colorCheck = colorLabel.createEl("input", {
			type: "checkbox",
		});
		colorCheck.checked = this.settings.printInColor;
		colorLabel.appendText(" Print in color");
		colorCheck.addEventListener(
			"change",
			async () => {
				this.settings.printInColor =
					colorCheck.checked;
				await this.saveSettings();
			},
		);
	}

	/**
	 * Renders the font settings row: family, size, auto-sync
	 */
	private renderFontRow(contentEl: HTMLElement): void {
		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.justifyContent = "center";
		container.style.alignItems = "center";
		container.style.gap = "15px";
		container.style.marginBottom = "20px";

		// Font family dropdown
		const fontLabel = container.createEl("label");
		fontLabel.style.display = "flex";
		fontLabel.style.alignItems = "center";
		fontLabel.style.gap = "5px";
		fontLabel.appendText("Font:");

		const fontSelect = fontLabel.createEl("select");
		fontSelect.style.minWidth = "120px";

		FONT_OPTIONS.forEach((option) => {
			const optEl = fontSelect.createEl("option");
			optEl.value = option.value;
			optEl.textContent = option.label;
		});

		fontSelect.value =
			this.settings.printFontFamily;
		fontSelect.addEventListener(
			"change",
			async () => {
				this.settings.printFontFamily =
					fontSelect.value;
				await this.saveSettings();
			},
		);

		// Font size input
		const sizeLabel = container.createEl("label");
		sizeLabel.style.display = "flex";
		sizeLabel.style.alignItems = "center";
		sizeLabel.style.gap = "5px";
		sizeLabel.appendText("Size:");

		const sizeInput = sizeLabel.createEl("input");
		sizeInput.type = "number";
		sizeInput.style.width = "60px";
		sizeInput.min = "8";
		sizeInput.max = "72";
		sizeInput.value = this.settings.fontSize.replace(
			"px",
			"",
		);
		sizeInput.addEventListener(
			"change",
			async () => {
				const value = validateFontSize(
					sizeInput.value,
					"12px",
				);
				this.settings.fontSize = value;

				if (
					this.settings.autoSyncHeadingSizes
				) {
					await initializeFontSizes(
						this.plugin,
					);
				}
				await this.saveSettings();
			},
		);

		// Auto-sync toggle
		const syncLabel = container.createEl("label");
		syncLabel.style.display = "flex";
		syncLabel.style.alignItems = "center";
		syncLabel.style.gap = "5px";
		syncLabel.style.fontSize = "12px";

		const syncCheck = syncLabel.createEl("input", {
			type: "checkbox",
		});
		syncCheck.checked =
			this.settings.autoSyncHeadingSizes;
		syncLabel.appendText("Auto-sync headings size");
		syncCheck.addEventListener(
			"change",
			async () => {
				this.settings.autoSyncHeadingSizes =
					syncCheck.checked;
				if (syncCheck.checked) {
					await initializeFontSizes(
						this.plugin,
					);
				}
				await this.saveSettings();
			},
		);
	}

	/**
	 * Renders the print button.
	 * No mode selection - uses unified capture strategy.
	 */
	private renderButtons(contentEl: HTMLElement): void {
		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.justifyContent = "center";
		container.style.gap = "10px";
		container.style.marginTop = "20px";

		const printBtn = container.createEl("button");
		printBtn.style.width = "150px";
		printBtn.style.color = "var(--text-accent)";
		printBtn.setText("Print");
		printBtn.addEventListener("click", () => {
			this.close();
			this.onSubmit();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

