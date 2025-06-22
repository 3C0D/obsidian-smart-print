import { Modal, App } from 'obsidian';
import type { SmartPrintPluginSettings } from './types.ts';
import { validateFontSize, initializeFontSizes } from './settings.ts';
import type SmartPrintPlugin from './main.ts';
import { FONT_OPTIONS } from './getStyles/fontOptions.ts';

export class PrintModeModal extends Modal {
    constructor(
        private plugin: SmartPrintPlugin,
        app: App,
        private settings: SmartPrintPluginSettings,
        private useAdvancedPrint: boolean,
        private onSubmit: (printMode: string | null) => void,
        private saveSettings: () => Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;

        // Set modal size
        this.modalEl.style.width = '500px';
        this.modalEl.style.height = '280px';

        contentEl.empty();
        contentEl.createEl('h2', { text: 'Print Options' });

        // Create first options row
        const optionsContainer = contentEl.createDiv();
        optionsContainer.style.display = 'flex';
        optionsContainer.style.justifyContent = 'center';
        optionsContainer.style.gap = '20px';
        optionsContainer.style.marginBottom = '15px';

        // Print title checkbox
        const titleLabel = optionsContainer.createEl('label');
        const titleCheck = titleLabel.createEl('input', { type: 'checkbox' });
        titleCheck.checked = this.settings.printTitle;
        titleLabel.appendText(' Print Title');
        titleCheck.addEventListener('change', async () => {
            this.settings.printTitle = titleCheck.checked;
            await this.saveSettings();
        });

        // Metadata checkbox
        const metadataLabel = optionsContainer.createEl('label');
        const metadataCheck = metadataLabel.createEl('input', { type: 'checkbox' });
        metadataCheck.checked = this.settings.showMetadata;
        metadataLabel.appendText(' Show Metadata');
        metadataCheck.addEventListener('change', async () => {
            this.settings.showMetadata = metadataCheck.checked;
            await this.saveSettings();
        });

        // Page breaks checkbox
        const breaksLabel = optionsContainer.createEl('label');
        const breaksCheck = breaksLabel.createEl('input', { type: 'checkbox' });
        breaksCheck.checked = this.settings.hrPageBreaks;
        breaksLabel.appendText(' Page Breaks at HR');
        breaksCheck.addEventListener('change', async () => {
            this.settings.hrPageBreaks = breaksCheck.checked;
            await this.saveSettings();
        });

        // Create second options row for font settings
        const fontContainer = contentEl.createDiv();
        fontContainer.style.display = 'flex';
        fontContainer.style.justifyContent = 'center';
        fontContainer.style.alignItems = 'center';
        fontContainer.style.gap = '15px';
        fontContainer.style.marginBottom = '20px';

        // Font family dropdown
        const fontFamilyLabel = fontContainer.createEl('label');
        fontFamilyLabel.style.display = 'flex';
        fontFamilyLabel.style.alignItems = 'center';
        fontFamilyLabel.style.gap = '5px';
        fontFamilyLabel.appendText('Font:');

        const fontSelect = fontFamilyLabel.createEl('select');
        fontSelect.style.minWidth = '120px';

        FONT_OPTIONS.forEach(option => {
            const optionEl = fontSelect.createEl('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
        });

        fontSelect.value = this.settings.printFontFamily;
        fontSelect.addEventListener('change', async () => {
            this.settings.printFontFamily = fontSelect.value;
            await this.saveSettings();
        });

        // Font size input
        const fontSizeLabel = fontContainer.createEl('label');
        fontSizeLabel.style.display = 'flex';
        fontSizeLabel.style.alignItems = 'center';
        fontSizeLabel.style.gap = '5px';
        fontSizeLabel.appendText('Size:');

        const fontSizeInput = fontSizeLabel.createEl('input');
        fontSizeInput.type = 'number';
        fontSizeInput.style.width = '60px';
        fontSizeInput.min = '8';
        fontSizeInput.max = '72';
        fontSizeInput.value = this.settings.fontSize.replace('px', '');
        fontSizeInput.addEventListener('change', async () => {
            const value = validateFontSize(fontSizeInput.value, '12px');
            this.settings.fontSize = value;

            // Auto-sync heading sizes if enabled
            if (this.settings.autoSyncHeadingSizes) {
                await initializeFontSizes(this.plugin);
            }

            await this.saveSettings();
        });

        // Auto-sync toggle
        const autoSyncLabel = fontContainer.createEl('label');
        autoSyncLabel.style.display = 'flex';
        autoSyncLabel.style.alignItems = 'center';
        autoSyncLabel.style.gap = '5px';
        autoSyncLabel.style.fontSize = '12px';

        const autoSyncCheck = autoSyncLabel.createEl('input', { type: 'checkbox' });
        autoSyncCheck.checked = this.settings.autoSyncHeadingSizes;
        autoSyncLabel.appendText('Auto-sync headings size');
        autoSyncCheck.addEventListener('change', async () => {
            this.settings.autoSyncHeadingSizes = autoSyncCheck.checked;
            if (autoSyncCheck.checked) {
                await initializeFontSizes(this.plugin);
            }
            await this.saveSettings();
        });

        // Create button container
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';

        // Basic Print button (Obsidian native)
        const basicBtn = buttonContainer.createEl('button');
        basicBtn.style.width = '150px';
        basicBtn.style.color = 'var(--text-accent)';
        basicBtn.setText('Basic');
        basicBtn.addEventListener('click', () => {
            this.close();
            this.onSubmit('basic');
        });

        // Standard Print button (in browser)
        if (this.settings.useBrowserPrint) {
            const standardBtn = buttonContainer.createEl('button');
            standardBtn.style.width = '150px';
            standardBtn.style.color = 'var(--text-accent)';
            standardBtn.setText('Standard (browser)');
            standardBtn.addEventListener('click', () => {
                this.close();
                this.onSubmit('standard');
            });
        }

        // Advanced Print button (in browser)
        if (this.useAdvancedPrint && this.settings.useBrowserPrint) {
            const advancedBtn = buttonContainer.createEl('button');
            advancedBtn.style.width = '150px';
            advancedBtn.style.color = 'var(--text-accent)';  
            advancedBtn.setText('Advanced (browser)');
            advancedBtn.addEventListener('click', () => {
                this.close();
                this.onSubmit('advanced');
            });
        }
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}