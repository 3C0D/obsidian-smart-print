import { Modal } from "obsidian";
import type SmartPrintPlugin from "./main.ts";
import { FONT_OPTIONS } from "./getStyles/fontOptions.ts";

export class FolderPrintModal extends Modal {
	constructor(
		private plugin: SmartPrintPlugin,
		private onSubmit: (confirmed: boolean) => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		this.modalEl.style.width = "450px";

		const header = contentEl.createDiv();
		header.style.display = "flex";
		header.style.justifyContent = "space-between";
		header.style.alignItems = "center";
		header.style.marginBottom = "20px";

		header.createEl("h2", { text: "Folder Print Options" });

		const closeBtn = header.createEl("button");
		closeBtn.setText("✕");
		closeBtn.title = "Close and disable this modal (re-enable in Settings)";
		closeBtn.style.background = "none";
		closeBtn.style.border = "none";
		closeBtn.style.fontSize = "20px";
		closeBtn.style.cursor = "pointer";
		closeBtn.addEventListener("click", async () => {
			this.plugin.settings.useFolderModal = false;
			await this.plugin.saveSettings();
			this.close();
			this.onSubmit(false);
		});

		const optionsContainer = contentEl.createDiv();
		optionsContainer.style.marginBottom = "20px";

		const combineLabel = optionsContainer.createEl("label");
		combineLabel.style.display = "block";
		combineLabel.style.marginBottom = "10px";
		const combineCheck = combineLabel.createEl("input", {
			type: "checkbox",
		});
		combineCheck.checked = this.plugin.settings.combineFolderNotes;
		combineLabel.appendText(" Combine notes");
		combineCheck.addEventListener("change", async () => {
			this.plugin.settings.combineFolderNotes = combineCheck.checked;
			await this.plugin.saveSettings();
		});

		const titleLabel = optionsContainer.createEl("label");
		titleLabel.style.display = "block";
		titleLabel.style.marginBottom = "10px";
		const titleCheck = titleLabel.createEl("input", { type: "checkbox" });
		titleCheck.checked = this.plugin.settings.printTitle;
		titleLabel.appendText(" Print Title");
		titleCheck.addEventListener("change", async () => {
			this.plugin.settings.printTitle = titleCheck.checked;
			await this.plugin.saveSettings();
		});

		const fontContainer = optionsContainer.createDiv();
		fontContainer.style.marginTop = "15px";
		fontContainer.style.display = "flex";
		fontContainer.style.alignItems = "center";
		fontContainer.style.gap = "10px";

		fontContainer.createSpan({ text: "Font:" });
		const fontSelect = fontContainer.createEl("select");
		fontSelect.style.flex = "1";
		FONT_OPTIONS.forEach((opt) => {
			const option = fontSelect.createEl("option");
			option.value = opt.value;
			option.textContent = opt.label;
		});
		fontSelect.value = this.plugin.settings.printFontFamily;
		fontSelect.addEventListener("change", async () => {
			this.plugin.settings.printFontFamily = fontSelect.value;
			await this.plugin.saveSettings();
		});

		const buttonsContainer = contentEl.createDiv();
		buttonsContainer.style.display = "flex";
		buttonsContainer.style.justifyContent = "flex-end";
		buttonsContainer.style.gap = "10px";

		const cancelBtn = buttonsContainer.createEl("button");
		cancelBtn.setText("Cancel");
		cancelBtn.addEventListener("click", () => {
			this.close();
			this.onSubmit(false);
		});

		const printBtn = buttonsContainer.createEl("button");
		printBtn.setText("Print");
		printBtn.style.color = "var(--text-accent)";
		printBtn.addEventListener("click", () => {
			this.close();
			this.onSubmit(true);
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
