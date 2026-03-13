import { Notice } from "obsidian";
import { isMobile } from "./utils/platform.ts";
import { Printd } from "printd";
import { ERROR_MESSAGES } from "./constants.ts";

// Timing constants for browser print operations
const TEMP_FILE_CLEANUP_DELAY_MS = 5000; // Delay before cleaning up temporary print files (allows browser to open the file)
const PRINT_TRIGGER_DELAY_MS = 100; // Small delay before triggering print to ensure content is fully rendered

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
                }, ${PRINT_TRIGGER_DELAY_MS});
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
				// 1. Lazy load Node.js modules exclusively on desktop
				// We use require() inside this block to prevent ESbuild from
				// bundling them for mobile, where these modules do not exist.
				const { tmpdir } = require("os") as typeof import("os");
				const { join } = require("path") as typeof import("path");
				const { writeFileSync, unlinkSync } = require("fs") as typeof import("fs");
				const { spawn } = require("child_process") as typeof import("child_process");

				// 2. Prepare a unique temporary file path
				const fileName = `obsidian-print-${Date.now()}.html`;
				const savePath = join(tmpdir(), fileName);

				// 3. Write the rendered HTML content to the temporary file
				writeFileSync(savePath, html);

				// 4. Open the file in the default browser using spawn for security.
				// Using spawn() instead of exec() prevents shell injection vulnerabilities
				// because arguments are passed as an array, not interpolated into a string.
				let childProcess;
				if (process.platform === "win32") {
					// Windows: Use 'cmd /c start "" "path"'
					childProcess = spawn("cmd", ["/c", "start", "", savePath], {
						detached: true,
						stdio: "ignore",
					});
				} else if (process.platform === "darwin") {
					// macOS: Use 'open path'
					childProcess = spawn("open", [savePath], {
						detached: true,
						stdio: "ignore",
					});
				} else {
					// Linux: Use 'xdg-open path'
					childProcess = spawn("xdg-open", [savePath], {
						detached: true,
						stdio: "ignore",
					});
				}

				// Unref allows the parent process to exit without waiting for the child
				childProcess.unref();

				// 5. Schedule a cleanup to delete the temporary file after
				// a small delay, giving the browser enough time to load it.
				setTimeout(() => {
					try {
						unlinkSync(savePath);
					} catch (cleanupError) {
						// Log cleanup failures for debugging, but don't show to user
						console.warn("Failed to cleanup temporary print file:", savePath, cleanupError);
					}
				}, TEMP_FILE_CLEANUP_DELAY_MS);
			} catch (error) {
				console.error("Failed to initialize desktop print:", error);
				new Notice(ERROR_MESSAGES.PRINT_DIALOG_FAILED_DETAILS);
			}
		}
	}
}
