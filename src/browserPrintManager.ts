import { Notice } from "obsidian";
import { isMobile } from "./utils/platform.ts";
import { Printd } from "printd";
import { ERROR_MESSAGES } from "./constants.ts";

// Delay before cleaning up temporary print files (allows browser to open the file)
const TEMP_FILE_CLEANUP_DELAY_MS = 5000;

/**
 * Prints the given content using the default browser
 */
export class PrintManager {
	/**
	 * Creates a printable HTML string from the given content and styles
	 */
	public createPrintableHtml(
		content: HTMLElement,
		styles: string,
		isAdvanced: boolean = false,
		filePath?: string,
	): string {
		const fileName = filePath || "Untitled";
		const title = isAdvanced ? "⚡" : "";
		const favicon = "🖨️";

		return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${title} ${fileName}</title>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${favicon}</text></svg>">
        <style>${styles}</style>
        <script>
            window.onload = function() {
                // browser console
                console.log("Content loaded, ready to print");
                // Small delay before printing to ensure everything is rendered
                setTimeout(function() {
                    window.print();
                }, 100);
            }
        </script>
    </head>
    <body>
        <div class="obsidian-print markdown-preview-view">
            ${content.outerHTML}
        </div>
    </body>
    </html>`;
	}

	/**
	 * Opens the HTML content in a browser and triggers the print dialog
	 * On desktop: Creates a temporary file and opens in browser
	 * On mobile: Uses Printd library for in-app printing
	 */
	public async browserPrint(html: string): Promise<void> {
		if (isMobile()) {
			// Mobile: use Printd for in-app printing
			try {
				const printd = new Printd();
				const parser = new DOMParser();
				const doc = parser.parseFromString(html, "text/html");
				const styles = Array.from(doc.querySelectorAll("style"))
					.map((s) => s.textContent || "")
					.join("\n");
				const body = doc.body;
				printd.print(body, [styles]);
			} catch (error) {
				console.error("Failed to print on mobile:", error);
				new Notice(ERROR_MESSAGES.PREPARE_CONTENT_FAILED);
			}
		} else {
			// Desktop: use file system and browser
			try {
				const { tmpdir } = await import("os");
				const path = await import("path");
				const { unlinkSync, writeFileSync } = await import("fs");
				const { exec } = await import("child_process");

				const fileName = `obsidian-print-${Date.now()}.html`;
				const savePath = path.join(tmpdir(), fileName);

				writeFileSync(savePath, html);

				const openCommand =
					process.platform === "win32"
						? `start "" "${savePath}"`
						: process.platform === "darwin"
							? `open "${savePath}"`
							: `xdg-open "${savePath}"`;

				exec(openCommand, (error: Error | null) => {
					if (error) {
						console.error("Failed to open browser:", error);
						new Notice(
							ERROR_MESSAGES.PRINT_DIALOG_FAILED +
								": " +
								error.message,
						);
					} else {
						setTimeout(() => {
							try {
								unlinkSync(savePath);
							} catch {
								// Silently fail if unable to delete temp file
							}
						}, TEMP_FILE_CLEANUP_DELAY_MS);
					}
				});
			} catch (error) {
				console.error("Failed to initialize desktop print:", error);
				new Notice(ERROR_MESSAGES.PRINT_DIALOG_FAILED_DETAILS);
			}
		}
	}
}
