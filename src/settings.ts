import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import SmartPrintPlugin from './main.ts';
import { getPrintSnippet, isPrintSnippetEnabled } from './getStyles/generatePrintStyles.ts';
import { getHeaderColors, getInlineTitleColor } from './getStyles/importThemeHeaders.ts';
import { FONT_OPTIONS } from './getStyles/fontOptions.ts';

export class PrintSettingTab extends PluginSettingTab {
    plugin: SmartPrintPlugin;

    constructor(app: App, plugin: SmartPrintPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Print note title')
            .setDesc('Include the note title in the printout.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.printTitle)
                .onChange(async (value) => {
                    this.plugin.settings.printTitle = value;
                    await this.plugin.saveSettings();
                }));

        // Font family setting
        createFontFamilyDropdownSetting(
            containerEl,
            'Font family',
            'Choose the font family for the printed note.',
            FONT_OPTIONS,
            this.plugin.settings.printFontFamily,
            async (value) => {
                this.plugin.settings.printFontFamily = value;
                await this.plugin.saveSettings();
            }
        );

        // Font size setting avec auto-sync
        createFontSizeSettingWithAutoSync(
            containerEl,
            'Font size',
            'Set the font size for the printed note (in pixels).',
            this.plugin.settings.fontSize,
            this.plugin.settings.autoSyncHeadingSizes,
            this.plugin,
            async (value) => {
                this.plugin.settings.fontSize = value;
                await this.plugin.saveSettings();
            },
            async (enabled) => {
                this.plugin.settings.autoSyncHeadingSizes = enabled;
                await this.plugin.saveSettings();
            },
            async () => {
                await initializeFontSizes(this.plugin);
                this.display(); // refresh pour voir les changements
            }
        );

        // Headers in ascending size order
        const hSizes = ['h6Size', 'h5Size', 'h4Size', 'h3Size', 'h2Size', 'h1Size'] as const;
        hSizes.forEach((hSize, index) => {
            const level = 6 - index;
            const defaultSize = `${12 + (level * 2)}px`;
            new Setting(containerEl)
                .setName(`Heading ${level} size`)
                .setDesc(`Set the size for <h${level}> elements (in pixels).`)
                .addText(text => text
                    .setPlaceholder(`${12 + (level * 2)}`)
                    .setValue(this.plugin.settings[hSize].replace('px', ''))
                    .onChange(async (value) => {
                        this.plugin.settings[hSize] = validateFontSize(value, defaultSize);
                        await this.plugin.saveSettings();
                    }));
        });

        new Setting(containerEl)
            .setName('Inline title size')
            .setDesc('Set the size for the inline title (in pixels).')
            .addText(text => text
                .setPlaceholder('26')
                .setValue(this.plugin.settings.inlineTitleSize.replace('px', ''))
                .onChange(async (value) => {
                    this.plugin.settings.inlineTitleSize = validateFontSize(value, '26px');
                    await this.plugin.saveSettings();
                }));

        const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

        new Setting(containerEl)
            .setName('Import theme colors')
            .setDesc('Import all heading colors and inline title color from your current theme (using light mode values). ⚠️ For inline title: ensure to have an open markdown view.')
            .addButton(button => button
                .setButtonText('get theme colors')
                .setTooltip('Import heading colors from your current theme. This will update all heading colors and inline title color.')
                .onClick(async () => {
                    await initializeThemeColors(this.app, this.plugin);
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Inline title color')
            .setDesc('Set the color for the inline title.')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.inlineTitleColor)
                .onChange(async (value) => {
                    this.plugin.settings.inlineTitleColor = value;
                    await this.plugin.saveSettings();
                }));

        hColors.forEach((hColor, index) => {
            new Setting(containerEl)
                .setName(`Heading ${index + 1} color`)
                .setDesc(`Set the color for <h${index + 1}> elements.`)
                .addColorPicker(color => color
                    .setValue(`${this.plugin.settings[hColor]}`)
                    .onChange(async (value) => {
                        this.plugin.settings[hColor] = value;
                        await this.plugin.saveSettings();
                    }));
        });

        new Setting(containerEl)
            .setName('Combine folder notes')
            .setDesc('When printing a folder, combine all notes into a single document. If disabled, each note will start on a new page.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.combineFolderNotes)
                .onChange(async (value) => {
                    this.plugin.settings.combineFolderNotes = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show metadata')
            .setDesc('Include the note metadata in the printout.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.showMetadata = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Treat horizontal lines as page breaks')
            .setDesc('Enable this option to interpret horizontal lines (---) as page breaks')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hrPageBreaks)
                .onChange(async (value) => {
                    this.plugin.settings.hrPageBreaks = value;
                    await this.plugin.saveSettings();
                }));

        const customCSSSetting = new Setting(containerEl)
            .setName('Custom CSS')
            .setDesc(`Click the folder icon to create a "print.css" file in snippets. A toggle will appear here once the file exists to enable/disable your custom styles. Use ".obsidian-print" as prefix for your selectors. e.g: ".obsidian-print a {...}".`)
            .addButton(button => button
                .setIcon('folder')
                .setTooltip('Open snippets folder')
                .onClick(async () => {
                    await this.app.openWithDefaultApp('.obsidian/snippets');
                    window.addEventListener('focus', () => {
                        this.display();
                    }, { once: true });
                }));

        if (getPrintSnippet(this.app)) {
            customCSSSetting.addToggle(toggle => toggle
                .setValue(isPrintSnippetEnabled(this.app))
                .onChange(async (value) => {
                    this.app.customCss.setCssEnabledStatus("print", value);
                    await this.plugin.saveSettings();
                }));
        }

        new Setting(containerEl)
            .setName('Show print mode selection')
            .setDesc('Show a modal to choose between basic, standard and advanced(when possible) print mode.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useModal)
                .onChange(async (value) => {
                    this.plugin.settings.useModal = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Use browser print')
            .setDesc('Enable advanced printing through browser. This provides more printing options and a better text formatting. When disabled, use Obsidian\'s basic print only with basic css styles.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useBrowserPrint)
                .onChange(async (value) => {
                    this.plugin.settings.useBrowserPrint = value;
                    await this.plugin.saveSettings();
                }));

    }
}

export async function initializeThemeColors(app: App, plugin: SmartPrintPlugin): Promise<void> {
    const headers = getHeaderColors(app);
    const hColors = ['h1Color', 'h2Color', 'h3Color', 'h4Color', 'h5Color', 'h6Color'] as const;

    hColors.forEach((hColor, index) => {
        const realColor = headers.get(index + 1) ?? "#000000";
        plugin.settings[hColor] = realColor;
    });

    const inlineTitleColor = getInlineTitleColor(app);
    plugin.settings.inlineTitleColor = inlineTitleColor;

    plugin.settings.hasInitializedColors = true;
    await plugin.saveSettings();
}

export async function initializeFontSizes(plugin: SmartPrintPlugin): Promise<void> {
    const baseSize = parseInt(plugin.settings.fontSize);
    if (isNaN(baseSize)) return;

    // Round to 1 decimal place for cleaner numbers
    plugin.settings.h6Size = `${Math.round(baseSize * 1.1 * 10) / 10}px`;
    plugin.settings.h5Size = `${Math.round(baseSize * 1.2 * 10) / 10}px`;
    plugin.settings.h4Size = `${Math.round(baseSize * 1.3 * 10) / 10}px`;
    plugin.settings.h3Size = `${Math.round(baseSize * 1.5 * 10) / 10}px`;
    plugin.settings.h2Size = `${Math.round(baseSize * 1.7 * 10) / 10}px`;
    plugin.settings.h1Size = `${Math.round(baseSize * 1.9 * 10) / 10}px`;
    plugin.settings.inlineTitleSize = `${Math.round(baseSize * 2 * 10) / 10}px`;

    plugin.settings.hasInitializedSizes = true;
    await plugin.saveSettings();
}

export function validateFontSize(value: string, defaultSize: string): string {
    value = value.trim().toLowerCase();

    if (!/^\d+(?:px)?$/.test(value)) {
        new Notice('Please enter a valid positive number');
        return defaultSize;
    }

    const numValue = parseFloat(value.replace('px', ''));
    if (numValue <= 0) {
        new Notice('Please enter a positive number');
        return defaultSize;
    }

    return `${numValue}px`;
}

// This function creates a dropdown setting for font family selection
function createFontFamilyDropdownSetting(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    options: { value: string; label: string }[],
    currentValue: string,
    onChange: (value: string) => Promise<void>
): Setting {
    return new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addDropdown(dropdown => {
            options.forEach(opt => {
                dropdown.addOption(opt.value, opt.label);
            });

            dropdown.setValue(currentValue || options[0].value);
            dropdown.onChange(async (value) => {
                await onChange(value);
            });
        });
}

// This function creates a text input setting for font size with auto-sync
function createFontSizeSettingWithAutoSync(
    containerEl: HTMLElement,
    name: string,
    desc: string,
    currentValue: string,
    autoSyncEnabled: boolean,
    plugin: any, // votre plugin
    onChange: (value: string) => Promise<void>,
    onToggleAutoSync: (enabled: boolean) => Promise<void>,
    onManualSync: () => Promise<void>
): Setting {
    const setting = new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addText(text => {
            text.setPlaceholder('12')
                .setValue(currentValue.replace('px', ''))
                .onChange(async (value) => {
                    const validatedValue = validateFontSize(value, '12px');
                    await onChange(validatedValue);
                });

            // Ajouter l'événement blur correctement
            text.inputEl.addEventListener('blur', async () => {
                if (plugin.settings.autoSyncHeadingSizes) {
                    await onManualSync();
                }
            });

            return text;
        });

    // Add toggle for auto-sync headings sizes
    const label = document.createElement('span');
    label.textContent = 'Auto-sync headings sizes';
    label.style.marginLeft = '5px';
    setting.controlEl.appendChild(label);

    setting.addToggle(toggle => toggle
        .setTooltip('Auto-sync heading sizes when font size changes')
        .setValue(autoSyncEnabled)
        .onChange(async (enabled) => {
            await onToggleAutoSync(enabled);
            if (enabled) {
                await onManualSync();
            }
        }));
    return setting;
}