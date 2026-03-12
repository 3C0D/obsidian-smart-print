import { App, MarkdownView, Notice } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";

declare module "obsidian" {
	interface WorkspaceLeaf {
		rebuildView(): void;
	}
}

/**
 * Advanced print mode: captures a complete snapshot of the preview content
 * Uses Obsidian's preview rendering system with full height capture
 */
export async function getRenderedContent(
	app: App,
	settings: SmartPrintPluginSettings,
	isSelection: boolean = false,
): Promise<HTMLElement | null> {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (!activeView) return null;

	// Get preview container
	const previewEl = activeView.contentEl.querySelector(
		".markdown-preview-view",
	) as HTMLElement;
	if (!previewEl) {
		new Notice("No preview element found");
		return null;
	}

	const wasInEditMode = activeView.getMode() === "source";

	try {
		// Force a complete re-render
		if (wasInEditMode) {
			await activeView.setState({ mode: "preview" }, { history: false });
		} else {
			// If already in preview, toggle modes to force refresh
			await activeView.setState({ mode: "source" }, { history: false });
			await new Promise((resolve) => setTimeout(resolve, 300));
			await activeView.setState({ mode: "preview" }, { history: false });
		}

		// Set styles for full content capture
		previewEl.style.height = "auto";
		previewEl.style.overflow = "visible";
		previewEl.style.maxHeight = "none";

		// Wait for content to stabilize
		await waitForStableContent(app, previewEl);

		// Create container and clone content
		const container = createDiv("markdown-preview-view");

		// Not working !
		// Note: To test an alternative solution for selection printing,
		// modify the handlePrint calls in main.ts from (false, true) to (true, true)
		// This will enable advanced print mode in the modal for selection operations
		if (isSelection) {
			const selection = window.getSelection();
			if (settings.debugMode) {
				console.log("Selection:", selection);
			}

			if (!selection || selection.rangeCount === 0) {
				new Notice("No text selected");
				return null;
			}

			const sizer = document.createElement("div");
			sizer.className = "markdown-preview-sizer";

			const range = selection.getRangeAt(0);
			const fragment = range.cloneContents();

			if (fragment.childNodes.length === 0) {
				if (settings.debugMode) {
					console.log("No content in selection fragment");
				}
				new Notice("Selection appears to be empty");
				return null;
			}

			if (settings.debugMode) {
				console.log("Selection fragment:", fragment);
			}

			Array.from(fragment.childNodes).forEach((node) => {
				if (node.nodeType === Node.TEXT_NODE) {
					const p = document.createElement("p");
					p.appendChild(node.cloneNode(true));
					sizer.appendChild(p);
				} else {
					sizer.appendChild(node.cloneNode(true));
				}
			});

			container.appendChild(sizer);
			if (settings.debugMode) {
				console.log("Final container with selection:", container);
			}
		} else {
			const originalSizer = previewEl.querySelector(
				".markdown-preview-sizer",
			);
			if (!originalSizer) {
				throw new Error("No markdown-preview-sizer found");
			}

			await new Promise((resolve) => setTimeout(resolve, 300));

			const clonedSizer = originalSizer.cloneNode(true) as HTMLElement;
			container.appendChild(clonedSizer);

			if (settings.debugMode) {
				document.querySelectorAll("style").forEach((style, i) => {
					if (style.textContent?.includes("MJX") || style.textContent?.includes("mjx")) {
						console.log(`Style[${i}] id:`, style.id, "length:", style.textContent.length);
					}
				});
			}

			// Copy MathJax global SVG font cache (required for math rendering)
			const mjxDefs = document.querySelector(
				'svg[style*="display: none"] defs, #MJX-SVG-global-cache',
			);
			if (mjxDefs) {
				const defsContainer = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"svg",
				);
				defsContainer.style.display = "none";
				defsContainer.appendChild(mjxDefs.cloneNode(true));
				container.insertBefore(defsContainer, container.firstChild);
			}
		}

		// Add metadata if enabled
		if (settings.showMetadata) {
			addMetadataToPreview(container, app);
		}

		// Inject MathJax CHTML styles required for math rendering
		const mjxStyles = document.getElementById("MJX-CHTML-styles");
		if (mjxStyles) {
			const styleEl = document.createElement("style");
			styleEl.textContent = mjxStyles.textContent;
			container.insertBefore(styleEl, container.firstChild);
		}

		return container;
	} finally {
		if (wasInEditMode) {
			await activeView.setState({ mode: "source" }, { history: false });
		}
		activeView.leaf.rebuildView();
	}
}

/**
 * Waits for content to be fully rendered and stable
 * Uses MutationObserver to track DOM changes and ensures content is ready
 */
async function waitForStableContent(
	app: App,
	element: HTMLElement,
): Promise<void> {
	// Wait for Obsidian's layout to be ready
	if (app.workspace?.onLayoutReady) {
		await new Promise<void>((resolve) => {
			app.workspace.onLayoutReady(() => resolve());
		});
	}

	// Wait for DOM mutations to settle
	return new Promise((resolve) => {
		// Initial delay before starting observation
		setTimeout(() => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			let mutationCount = 0;
			let lastMutationTime = Date.now();

			const observer = new MutationObserver(() => {
				mutationCount++;
				lastMutationTime = Date.now();
			});

			observer.observe(element, {
				childList: true,
				subtree: true,
				attributes: true,
				characterData: true,
			});

			// Check stability every 100ms
			const stabilityChecker = setInterval(() => {
				const timeSinceLastMutation = Date.now() - lastMutationTime;

				// Consider content stable if no mutations for 1 seconds
				if (timeSinceLastMutation > 1000) {
					clearInterval(stabilityChecker);
					observer.disconnect();
					resolve();
				}
			}, 100);

			// Safety timeout after 5 seconds
			setTimeout(() => {
				clearInterval(stabilityChecker);
				observer.disconnect();
				resolve();
			}, 5000);
		}, 500); // Initial delay
	});
}

/**
 * Advanced print mode: captures a complete snapshot of the preview content
 * Uses Obsidian's preview rendering system with full height capture
 */
// Add this new function
function addMetadataToPreview(container: HTMLElement, app: App): void {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) return;

	const metadata = app.metadataCache.getFileCache(activeFile)?.frontmatter;
	if (metadata && Object.keys(metadata).length > 0) {
		const sizer = container.querySelector(".markdown-preview-sizer");
		if (sizer) {
			const metadataContainer = createDiv("custom-metadata-container");
			const metadataContent = metadataContainer.createDiv(
				"custom-metadata-content",
			);
			Object.entries(metadata).forEach(([key, value]) => {
				const line = metadataContent.createDiv("custom-metadata-line");
				const displayValue = Array.isArray(value)
					? value.join(", ")
					: typeof value === "object" && value !== null
						? JSON.stringify(value)
						: String(value);
				line.setText(`${key}: ${displayValue}`);
			});
			sizer.insertBefore(metadataContainer, sizer.firstChild);
		}
	}
}
