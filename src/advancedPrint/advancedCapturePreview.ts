import { App, MarkdownView, Notice } from "obsidian";
import type { SmartPrintPluginSettings } from "../types.ts";
import { getMetadata, renderMetadata } from "../utils/metadata.ts";

// Timing constants for content capture and stabilization
const MODE_SWITCH_DELAY_MS = 300; // Delay after switching editor modes to ensure DOM updates
const CONTENT_STABILITY_THRESHOLD_MS = 1000; // Time without mutations to consider content stable
const CONTENT_STABILITY_CHECK_INTERVAL_MS = 100; // How often to check for stability
const CONTENT_STABILITY_TIMEOUT_MS = 5000; // Maximum wait time for content to stabilize
const MUTATION_OBSERVER_INITIAL_DELAY_MS = 500; // Initial delay before starting mutation observation

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
			await new Promise((resolve) =>
				setTimeout(resolve, MODE_SWITCH_DELAY_MS),
			);
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

			const clonedSizer = originalSizer.cloneNode(true) as HTMLElement;
			
			// Flatten embedded notes: replace full preview structure with just content.
			// Embedded notes contain a complete .markdown-preview-view structure that behaves
			// like an independent page. We extract the content and rebuild it as a simple
			// inline block to prevent layout issues during printing.
			clonedSizer.querySelectorAll(".internal-embed:not(.image-embed)").forEach((embed) => {
				const embedEl = embed as HTMLElement;
				const title = embedEl.querySelector(".embed-title")?.textContent ?? "";
				const innerSizer = embedEl.querySelector(".markdown-preview-sizer");
				
				if (innerSizer) {
					const wrapper = document.createElement("div");
					wrapper.className = "obsidian-print-embed";
					
					if (title) {
						const titleEl = document.createElement("div");
						titleEl.className = "obsidian-print-embed-title";
						titleEl.textContent = title;
						wrapper.appendChild(titleEl);
					}
					
					const content = document.createElement("div");
					content.className = "obsidian-print-embed-content";
					Array.from(innerSizer.childNodes).forEach((node) => {
						content.appendChild(node.cloneNode(true));
					});
					wrapper.appendChild(content);
					embedEl.replaceWith(wrapper);
				}
			});
			
			if (settings.debugMode) {
				clonedSizer.querySelectorAll(".internal-embed:not(.image-embed)").forEach((el) => {
					console.log("embed HTML:", el.innerHTML.substring(0, 500));
				});
			}
			
			container.appendChild(clonedSizer);

			// Remove first H1 if it duplicates the file title (automatic behavior)
			if (settings.printTitle) {
				const activeFile = app.workspace.getActiveFile();
				if (activeFile) {
					const titleText = activeFile.basename.toLowerCase().trim();
					const firstH1 = clonedSizer.querySelector(
						"h1:not(.inline-title)",
					);
					if (
						firstH1 &&
						firstH1.textContent?.toLowerCase().trim() === titleText
					) {
						firstH1.remove();
					}
				}
			}

			if (settings.debugMode) {
				document.querySelectorAll("style").forEach((style, i) => {
					if (
						style.textContent?.includes("MJX") ||
						style.textContent?.includes("mjx")
					) {
						console.log(
							`Style[${i}] id:`,
							style.id,
							"length:",
							style.textContent.length,
						);
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
			const metadata = getMetadata(app, app.workspace.getActiveFile()!);
			if (metadata) {
				const sizer = container.querySelector(
					".markdown-preview-sizer",
				);
				if (sizer) {
					renderMetadata(metadata, sizer as HTMLElement);
				}
			}
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
			let lastMutationTime = Date.now();

			const observer = new MutationObserver(() => {
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

				// Consider content stable if no mutations for the threshold period
				if (timeSinceLastMutation > CONTENT_STABILITY_THRESHOLD_MS) {
					clearInterval(stabilityChecker);
					observer.disconnect();
					resolve();
				}
			}, CONTENT_STABILITY_CHECK_INTERVAL_MS);

			// Safety timeout to prevent infinite waiting
			setTimeout(() => {
				clearInterval(stabilityChecker);
				observer.disconnect();
				resolve();
			}, CONTENT_STABILITY_TIMEOUT_MS);
		}, MUTATION_OBSERVER_INITIAL_DELAY_MS);
	});
}
