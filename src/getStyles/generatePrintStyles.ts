import { App, Notice, type PluginManifest } from 'obsidian';
import path from 'path';
import type { SmartPrintPluginSettings } from '../types.ts';
import { FONT_OPTIONS } from './fontOptions.ts';

/**
 * Generates CSS styles for printing, combining plugin styles, user snippets, and some styles settings
 */
export async function generatePrintStyles(
    app: App,
    manifest: PluginManifest,
    settings: SmartPrintPluginSettings
): Promise<string> {
    const adapter = app.vault.adapter;

    // Read plugin stylesheet
    let pluginStyle = '';
    if (manifest.dir) {
        const cssPath = path.join(manifest.dir, 'styles.css');
        try {
            pluginStyle = await adapter.read(cssPath);
        } catch {
            new Notice('Default styling could not be located.');
        }
    } else {
        new Notice('Could not find the plugin path. No default print styles will be added.');
    }

    // Read user print stylesheet (optional)
    const userStyle =
        getPrintSnippet(app) && isPrintSnippetEnabled(app)
            ? getPrintSnippetValue(app) ?? ''
            : '';

    // Generate CSS for headings with sizes and colors from settings
    const titleCSS = settings.printTitle ? `
.obsidian-print .inline-title {
    display: block !important;
    font-size: ${settings.inlineTitleSize} !important;
    color: ${settings.inlineTitleColor} !important;
}` : `
.obsidian-print .inline-title {
    display: none !important;
}`;

    const headingsCSS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        .map((tag) => {
            const sizeKey = `${tag}Size` as keyof SmartPrintPluginSettings;
            const colorKey = `${tag}Color` as keyof SmartPrintPluginSettings;
            return `.obsidian-print ${tag} { font-size: ${settings[sizeKey]}; color: ${settings[colorKey]}; }`;
        })
        .join('\n');

        
    // MathJax styles extraction not working - keeping for reference
    // const mathJaxStyles = document.querySelector('style[data-id="MJX-CHTML-styles"]')?.innerHTML || '';
    // const mathJaxSpecificStyles = `
    //     .obsidian-print .math-block {
    //         display: block !important;
    //         margin: 1em 0;
    //     }
    //     .obsidian-print .math-inline {
    //         display: inline-block !important;
    //     }
    //     .obsidian-print mjx-container {
    //         display: inline-block !important;
    //     }
    //     .obsidian-print mjx-container[jax="CHTML"][display="true"] {
    //         display: block !important;
    //         margin: 1em 0;
    //     }
    // `;

    // Final combined CSS, including hr page breaks
    return `
        .obsidian-print { font-size: ${settings.fontSize}; font-family: ${getFontFamily(settings.printFontFamily)}; }
        ${titleCSS}
        ${headingsCSS}
        ${settings.hrPageBreaks ? '.obsidian-print hr { page-break-before: always; border: none; }' : ''}
        ${!settings.showMetadata ? '.obsidian-print .metadata-container { display: none !important; }' : ''}
        ${pluginStyle}
        ${userStyle}
    `;
}

export function getFontFamily(fontKey?: string): string {
    const fontOption = FONT_OPTIONS.find(font => font.value === fontKey);
    return fontOption?.css || FONT_OPTIONS[0].css;
}

function getPrintSnippetValue(app: App): string | undefined {
    const printCssPath = '.obsidian/snippets/print.css';
    return app.customCss.csscache.get(printCssPath);
}

export function isPrintSnippetEnabled(app: App): boolean {
    return app.customCss.enabledSnippets.has('print');
}

export function getPrintSnippet(app: App): boolean {
    return app.customCss.snippets.contains('print');
}
