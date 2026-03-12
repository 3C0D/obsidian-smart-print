import { Printd } from "printd";
import type { SmartPrintPluginSettings } from "../types.ts";
import {
	switchToLightTheme,
} from "../utils/themeSwitch.ts";

/**
 * Opens a preview window then allows the user to print.
 *
 * @param content - Rendered HTML content
 * @param settings - Plugin settings
 * @param cssString - CSS styles to apply
 */
export async function openPrintModal(
	content: HTMLElement,
	settings: SmartPrintPluginSettings,
	cssString: string,
): Promise<void> {
	const styleManager =
		new PrintStyleManager(settings);
	const printContent =
		styleManager.prepareForPrint(content);

	const preview = new PrintPreview();
	preview.createPreview(printContent, cssString, {
		width: "90%",
		height: "90%",
		scale: 1,
	});
}

/**
 * Prints content directly without showing a preview.
 * Uses Printd to trigger the system print dialog
 * immediately.
 *
 * @param content - Rendered HTML content
 * @param settings - Plugin settings
 * @param cssString - CSS styles to apply
 */
export async function directPrint(
	content: HTMLElement,
	settings: SmartPrintPluginSettings,
	cssString: string,
): Promise<void> {
	const restoreTheme = switchToLightTheme();

	try {
		const styleManager =
			new PrintStyleManager(settings);
		const printContent =
			styleManager.prepareForPrint(content);

		const htmlElement =
			document.createElement("html");
		const headElement =
			document.createElement("head");
		const bodyElement =
			document.createElement("body");

		const styleElement =
			document.createElement("style");
		styleElement.textContent = cssString;
		headElement.appendChild(styleElement);

		bodyElement.className = "obsidian-print";
		bodyElement.appendChild(printContent);

		htmlElement.appendChild(headElement);
		htmlElement.appendChild(bodyElement);

		const printd = new Printd();
		printd.print(htmlElement, [cssString]);
	} finally {
		restoreTheme();
	}
}


interface PrintPreviewOptions {
	width?: string;
	height?: string;
	scale?: number;
}

/**
 * Handles the print preview window and printing functionality
 */
class PrintPreview {
	private previewWindow: HTMLDivElement | null = null;
	private printd: Printd;
	private restoreTheme: (() => void) | null = null;

	constructor() {
		this.printd = new Printd();
	}

	createPreview(
		element: HTMLElement,
		globalCss: string,
		options: PrintPreviewOptions = {},
	): void {
		// Switch to light theme for print rendering
		this.restoreTheme = switchToLightTheme();

		this.previewWindow = document.createElement("div");
		this.previewWindow.className = "print-preview-window";

		const containerStyles = `
.print-preview-window {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border: 1px solid #ccc;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    z-index: 9999;
    overflow: auto;
    width: ${options.width || "80%"};
    height: ${options.height || "80%"};
    scrollbar-width: thin;
}
.print-preview-controls {
    position: sticky;
    top: 0;
    width: 100%;
    padding: 10px;
    background-color:rgba(66, 67, 65, 0.12);
    border-bottom: 1px solid rgb(28, 27, 26);
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    z-index: 1;
}
.print-preview-content {
    margin-top: 20px;
    background-color: #f0f0f0;
    padding: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.print-preview-page {
    background-color: white;
    margin: 20px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    position: relative;
    box-sizing: border-box;
    width: auto;
    height: auto;
    overflow: visible;
}
.print-preview-page-content {
    padding: 20px;
    box-sizing: border-box;
    width: 100%;
    height: auto;
    overflow: visible;
}
        `;

		const style = document.createElement("style");
		style.textContent = globalCss + "\n" + containerStyles;

		const controls = document.createElement("div");
		controls.className = "print-preview-controls";

		const printButton = document.createElement("button");
		printButton.textContent = "Print";
		printButton.onclick = (): void => {
			this.printd.print(element, [globalCss]);
			this.close();
		};

		const closeButton = document.createElement("button");
		closeButton.textContent = "Close";
		closeButton.onclick = (): void => this.close();

		controls.append(printButton, closeButton);

		const contentContainer = document.createElement("div");
		contentContainer.className = "print-preview-content";

		// Create a self-sizing page with 20px padding
		const page = document.createElement("div");
		page.className = "print-preview-page";
		const pageContent = document.createElement("div");
		pageContent.className = "print-preview-page-content";
		pageContent.appendChild(element.cloneNode(true));
		page.appendChild(pageContent);
		contentContainer.appendChild(page);

		this.previewWindow.append(style, controls, contentContainer);
		document.body.appendChild(this.previewWindow);

		if (options.scale) {
			contentContainer.style.transform = `scale(${options.scale})`;
			contentContainer.style.transformOrigin = "top center";
		}
	}

	close(): void {
		if (this.restoreTheme) {
			this.restoreTheme();
			this.restoreTheme = null;
		}
		this.previewWindow?.parentNode?.removeChild(
			this.previewWindow,
		);
		this.previewWindow = null;
	}
}

/**
 * Manages the styling of content for printing
 */
export class PrintStyleManager {
	constructor(private settings: SmartPrintPluginSettings) { }

	/**
	 * Prepares the content for printing by adding necessary print classes
	 * @param content The HTML content to prepare
	 * @returns The prepared content
	 */
	prepareForPrint(content: HTMLElement): HTMLElement {
		const printContent = content.cloneNode(true) as HTMLElement;
		printContent.classList.add("obsidian-print");

		// Note: settings parameter available for future use
		// Currently used for potential print customizations
		return printContent;
	}
}
