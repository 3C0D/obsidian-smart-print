import { App, type PluginManifest, Notice, MarkdownView } from 'obsidian';
import { generatePrintStyles } from '../getStyles/generatePrintStyles.ts';
import { PrintManager } from '../browserPrintManager.ts';
import type { SmartPrintPluginSettings } from '../types.ts';

/**
 * Prints the given content using the default browser
 */
export async function printContent(
    content: HTMLElement | null,
    app: App,
    manifest: PluginManifest,
    settings: SmartPrintPluginSettings
): Promise<void> {
    if (!content) {
        new Notice('No content to print');
        return;
    }

    try {
        // Get active file path
        const activeView = app.workspace.getActiveViewOfType(MarkdownView);
        const filePath = activeView?.file?.path || "Untitled";

        // generate styles  
        const globalCss = await generatePrintStyles(app, manifest, settings);

        const printer = new PrintManager();
        // Print the final content
        await printer.browserPrint(printer.createPrintableHtml(content, globalCss, false, filePath));

    } catch (error) {
        console.error('Print error:', error);
        new Notice('Failed to print content');
    }
}