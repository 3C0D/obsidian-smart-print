import { Modal, App, Platform } from "obsidian";
import type { SmartPrintPluginSettings } from "./types.ts";
import { validateFontSize, initializeFontSizes } from "./settings.ts";
import type SmartPrintPlugin from "./main.ts";
import { FONT_OPTIONS } from "./getStyles/fontOptions.ts";
import { createCheckbox } from "./ui/checkboxHelper.ts";
import type { ContentFlags } from "./utils/contentScanner.ts";

/**
 * Simplified print options modal.
 *
 * No longer asks for print mode - uses unified capture strategy that
 * automatically selects the best rendering method.
 *
 * Provides user-facing options:
 * - Content: title, metadata, page breaks, colors, comments
 * - Typography: font family, size, auto-sync headings
 * - Folder-specific: combine notes option
 */
export class PrintModeModal extends Modal {
	constructor(
		private plugin: SmartPrintPlugin,
		app: App,
		private settings: SmartPrintPluginSettings,
		private onSubmit: () => void,
		private saveSettings: () => Promise<void>,
		private isFolderPrint: boolean = false,
		private isSelection: boolean = false,
		private contentFlags: ContentFlags = {
			hasImages: true,
			hasEmbeds: true,
			hasComments: true,
			hasMetadata: true,
			hasHrBreaks: true,
		},
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;

		this.modalEl.addClass("smart-print-modal");

		contentEl.empty();

		const title = contentEl.createEl("h2");
		title.setText(
			this.isFolderPrint ? "Folder Print Options " : "Print Options ",
		);

		const hint = title.createEl("span");
		hint.addClass("print-modal-hint");
		hint.setText("(options adapt to document content)");

		// Warning for folder print or selection (no post-render)
		if (this.isFolderPrint || this.isSelection) {
			const warningEl = contentEl.createEl("div");
			warningEl.setText(
				"Note: No post-render (Mermaid, Dataview, LaTeX will not render)",
			);
			warningEl.style.fontSize = "11px";
			warningEl.style.color = "var(--text-muted)";
			warningEl.style.backgroundColor = "rgba(255, 200, 200, 0.15)";
			warningEl.style.padding = "3px 8px";
			warningEl.style.borderRadius = "3px";
			warningEl.style.marginBottom = "12px";
			warningEl.style.fontStyle = "italic";
		}

		this.renderOptionsRow(contentEl);
		this.renderFontRow(contentEl);
		this.renderButtons(contentEl);
	}

	/**
	 * Renders the first row: checkboxes for quick options.
	 *
	 * Options include:
	 * - Show File Title: Displays filename as document title
	 * - Show Metadata: Displays frontmatter at top
	 * - Page Breaks at ---: Treats horizontal rules as page breaks
	 * - Print in color: Toggle between color and black & white
	 * - Show comments: Display Obsidian comments (%% ... %%)
	 */
	private renderOptionsRow(contentEl: HTMLElement): void {
		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.justifyContent = "center";
		container.style.gap = "20px";
		container.style.marginBottom = "15px";

		// Print title checkbox.
		// When enabled, displays the filename as a title at the top.
		// Automatically removes duplicate H1 if it matches the filename.
		createCheckbox(
			container,
			" Show File Title",
			"Displays the filename as the document title.\nAutomatically hides first H1 if it matches the filename.\n\n(Class: .inline-title)",
			this.settings.printTitle,
			async (checked) => {
				this.settings.printTitle = checked;
				await this.saveSettings();
			},
		);

		// Metadata checkbox
		if (this.contentFlags.hasMetadata) {
			createCheckbox(
				container,
				" Show Metadata",
				"Display frontmatter metadata at the top of the document.\n\n(Class: .custom-metadata-container)",
				this.settings.showMetadata,
				async (checked) => {
					this.settings.showMetadata = checked;
					await this.saveSettings();
				},
			);
		}

		// Page breaks checkbox
		if (this.contentFlags.hasHrBreaks) {
			createCheckbox(
				container,
				" Page Breaks at ---",
				"Each horizontal rule (---) triggers a page break when printing.\n\n(Selector: .obsidian-print hr)",
				this.settings.hrPageBreaks,
				async (checked) => {
					this.settings.hrPageBreaks = checked;
					await this.saveSettings();
				},
			);
		}

		// Print in color checkbox
		createCheckbox(
			container,
			" Print in color",
			"Print with colors or force black & white output.\n\n(Selector: .obsidian-print *)",
			this.settings.printInColor,
			async (checked) => {
				this.settings.printInColor = checked;
				await this.saveSettings();
			},
		);

		// Show comments checkbox with warning.
		// Important: Enabling comments disables advanced rendering because
		// comments are already stripped from the DOM in preview mode.
		if (this.contentFlags.hasComments) {
			const commentsWrapper = container.createDiv();
			commentsWrapper.style.display = "flex";
			commentsWrapper.style.flexDirection = "column";
			commentsWrapper.style.gap = "3px";

			const commentsLabel = commentsWrapper.createEl("label");
			const commentsCheck = commentsLabel.createEl("input", {
				type: "checkbox",
			});
			commentsCheck.checked = this.settings.showComments;
			commentsLabel.appendText(" Show comments");
			commentsLabel.title =
				"Show Obsidian comments (%% ... %%) in print output.\n⚠ Enabling this disables advanced rendering (Mermaid, LaTeX, Dataview).\n\n(Class: .obsidian-comment)";

			// Warning only for non-folder print (folder print already has warning at top)
			let warningEl: HTMLElement | null = null;
			if (!this.isFolderPrint) {
				warningEl = commentsWrapper.createEl("span");
				warningEl.setText("(No post-render)");
				warningEl.style.display =
					this.settings.showComments && !Platform.isMobile
						? "block"
						: "none";
				warningEl.style.fontSize = "10px";
				warningEl.style.paddingLeft = "16px";
				warningEl.style.color = "#a0522d";
				warningEl.style.backgroundColor = "#fdf6ec";
				warningEl.style.borderRadius = "3px";
				warningEl.style.padding = "1px 5px";
				warningEl.style.border = "1px solid #e8c97a";
			}

			commentsCheck.addEventListener("change", async () => {
				this.settings.showComments = commentsCheck.checked;
				// Only show warning for non-folder print
				if (!this.isFolderPrint && warningEl) {
					warningEl.style.display =
						commentsCheck.checked && !Platform.isMobile
							? "block"
							: "none";
				}
				await this.saveSettings();
			});
		}

		// Hide images checkbox
		if (this.contentFlags.hasImages) {
			createCheckbox(
				container,
				" Hide images",
				"Hide all images from print output.\n\n(Selector: .obsidian-print img)",
				this.settings.hideImages,
				async (checked) => {
					this.settings.hideImages = checked;
					await this.saveSettings();
				},
			);
		}

		// Hide embeds checkbox
		if (this.contentFlags.hasEmbeds) {
			createCheckbox(
				container,
				" Hide embed files",
				"Hide embedded notes (![[note]]) from print output.\n\n(Selector: .obsidian-print .obsidian-print-embed)",
				this.settings.hideEmbeds,
				async (checked) => {
					this.settings.hideEmbeds = checked;
					await this.saveSettings();
				},
			);
		}
	}

	/**
	 * Renders the font settings row: family, size, auto-sync.
	 *
	 * Features:
	 * - Font family dropdown with 20+ options
	 * - Font size input (8-72px range)
	 * - Auto-sync toggle to scale headings proportionally
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

		fontSelect.value = this.settings.printFontFamily;
		fontSelect.addEventListener("change", async () => {
			this.settings.printFontFamily = fontSelect.value;
			await this.saveSettings();
		});

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
		sizeInput.value = this.settings.fontSize.replace("px", "");
		sizeInput.addEventListener("change", async () => {
			const value = validateFontSize(sizeInput.value, "12px");
			this.settings.fontSize = value;

			if (this.settings.autoSyncHeadingSizes) {
				await initializeFontSizes(this.plugin);
			}
			await this.saveSettings();
		});

		// Auto-sync toggle
		const syncLabel = container.createEl("label");
		syncLabel.style.display = "flex";
		syncLabel.style.alignItems = "center";
		syncLabel.style.gap = "5px";
		syncLabel.style.fontSize = "12px";

		const syncCheck = syncLabel.createEl("input", {
			type: "checkbox",
		});
		syncCheck.checked = this.settings.autoSyncHeadingSizes;
		syncLabel.appendText("Scale headings with base size");
		syncLabel.title =
			"All heading sizes automatically adjust when you change the base font size.";
		syncCheck.addEventListener("change", async () => {
			this.settings.autoSyncHeadingSizes = syncCheck.checked;
			if (syncCheck.checked) {
				await initializeFontSizes(this.plugin);
			}
			await this.saveSettings();
		});
	}

	/**
	 * Renders the print button.
	 *
	 * No mode selection needed - the unified capture strategy
	 * automatically chooses the best rendering method.
	 *
	 * For folder print, also includes "Combine notes" checkbox.
	 */
	private renderButtons(contentEl: HTMLElement): void {
		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.justifyContent = "center";
		container.style.alignItems = "center";
		container.style.gap = "15px";
		container.style.marginTop = "20px";

		const printBtn = container.createEl("button");
		printBtn.style.width = "150px";
		printBtn.style.color = "var(--text-accent)";
		printBtn.setText("Print");
		printBtn.addEventListener("click", () => {
			this.close();
			this.onSubmit();
		});

		// Combine notes checkbox (only for folder print).
		// When enabled, all notes print continuously.
		// When disabled, each note starts on a new page.
		if (this.isFolderPrint) {
			const combineLabel = container.createEl("label");
			combineLabel.style.display = "flex";
			combineLabel.style.alignItems = "center";
			combineLabel.style.gap = "5px";
			const combineCheck = combineLabel.createEl("input", {
				type: "checkbox",
			});
			combineCheck.checked = this.settings.combineFolderNotes;
			combineLabel.appendText(" Combine notes");
			combineLabel.title =
				"When enabled, all notes are printed continuously.\nWhen disabled, each note starts on a new page.\n\n(Invisible <hr> elements with page-break-before: always)";
			combineCheck.addEventListener("change", async () => {
				this.settings.combineFolderNotes = combineCheck.checked;
				await this.saveSettings();
			});
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
