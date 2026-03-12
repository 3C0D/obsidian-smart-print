export interface SmartPrintPluginSettings {
	// ─── Content options ───────────────────────
	printTitle: boolean;
	showMetadata: boolean;
	hrPageBreaks: boolean;
	combineFolderNotes: boolean;
	/** Print with colors or force black & white */
	printInColor: boolean;
	/** Show Obsidian comments (%% ... %%) in print output */
	showComments: boolean;
	/** Hide first H1 if it matches the file title */
	hideH1IfSameAsTitle: boolean;

	// ─── Font settings ─────────────────────────
	fontSize: string;
	inlineTitleSize: string;
	h1Size: string;
	h2Size: string;
	h3Size: string;
	h4Size: string;
	h5Size: string;
	h6Size: string;
	printFontFamily: string;
	autoSyncHeadingSizes: boolean;

	// ─── Color settings ────────────────────────
	inlineTitleColor: string;
	h1Color: string;
	h2Color: string;
	h3Color: string;
	h4Color: string;
	h5Color: string;
	h6Color: string;
	hasInitializedColors: boolean;
	hasInitializedSizes: boolean;

	// ─── UI / UX options ───────────────────────
	/** Show printer icon in the left ribbon */
	showRibbonIcon: boolean;
	/** Show print entries in context menus */
	showContextMenu: boolean;
	/** Group context menu items under a submenu */
	useSubmenu: boolean;
	/** Show print mode modal (desktop only) */
	useModal: boolean;
	/** Show folder print options modal */
	useFolderModal: boolean;
	/** Show preview before printing */
	usePreview: boolean;
	/** Skip preview, print directly (basic mode) */
	skipPreview: boolean;

	// ─── Print engine (desktop only) ───────────
	/** Enable browser-based printing */
	useBrowserPrint: boolean;

	// ─── Internal ──────────────────────────────
	debugMode: boolean;
}

export const DEFAULT_SETTINGS: SmartPrintPluginSettings =
{
	// Content
	printTitle: true,
	showMetadata: false,
	hrPageBreaks: false,
	combineFolderNotes: false,
	printInColor: true,
	showComments: false,
	hideH1IfSameAsTitle: true,

	// Font sizes
	fontSize: "12px",
	h6Size: "14px",
	h5Size: "16px",
	h4Size: "18px",
	h3Size: "20px",
	h2Size: "22px",
	h1Size: "24px",
	inlineTitleSize: "26px",
	printFontFamily:
		"var(--print-font-family," +
		" -apple-system, BlinkMacSystemFont," +
		' "Segoe UI", Roboto, Arial,' +
		" sans-serif)",
	autoSyncHeadingSizes: true,

	// Colors
	inlineTitleColor: "black",
	h1Color: "black",
	h2Color: "black",
	h3Color: "black",
	h4Color: "black",
	h5Color: "black",
	h6Color: "black",
	hasInitializedColors: false,
	hasInitializedSizes: false,

	// UI
	showRibbonIcon: true,
	showContextMenu: true,
	useSubmenu: true,
	useModal: true,
	useFolderModal: true,
	usePreview: true,
	skipPreview: false,

	// Engine
	useBrowserPrint: true,

	// Internal
	debugMode: false,
};

