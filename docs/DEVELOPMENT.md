# Development Notes for LLMs

**Last updated:** 2026-03-12
**Status:** Active reference document

---

## Architecture Overview

```
src/
├── main.ts                      # Plugin entry, commands, menus
├── PrintModeModal.ts            # Print mode selection (desktop only)
├── browserPrintManager.ts       # Desktop: temp file + browser
│                                # Mobile: Printd in-app
├── normalCapturePreview.ts      # Markdown → HTML rendering (standard)
├── folderPrint.ts               # Print all files in a folder
├── settings.ts                  # Settings tab + init functions
├── constants.ts                 # Error message constants
├── types.ts                     # Settings interface + defaults
├── basicPrint/
│   ├── basicPrint.ts            # Browser print (via PrintManager)
│   └── basicPrintPreview.ts     # In-app preview with Printd
├── advancedPrint/
│   ├── advancedPrint.ts         # Full DOM capture + browser print
│   └── advancedCapturePreview.ts  # DOM snapshot with MutationObserver
├── getStyles/
│   ├── generatePrintStyles.ts   # Combines CSS sources
│   ├── importThemeHeaders.ts    # Extract theme heading colors
│   └── fontOptions.ts           # Font family definitions (22 fonts)
└── utils/
    ├── platform.ts              # isMobile() utility
    └── themeSwitch.ts           # switchToLightTheme() utility
```

---

## Print Modes Explained

| Mode | Engine | Platform | What it does |
|---|---|---|---|
| **Basic** | Printd (Electron) | Desktop + Mobile | In-app preview window with Print/Close buttons |
| **Standard** | Browser | Desktop only | Creates temp HTML file → opens in browser → auto Ctrl+P |
| **Advanced** | Browser | Desktop only | Like Standard but captures full rendered preview DOM (Mermaid, callouts, etc.) |

### Key flow:
1. `handlePrint()` in `main.ts` is the entry point
2. On mobile → goes directly to `basicPrint()` (no modal)
3. On desktop with modal → shows `PrintModeModal` with 1-3 buttons
4. On desktop without modal → routes based on `useBrowserPrint` setting

---

## Mobile Compatibility Rules

- **NEVER** import Node.js modules (`path`, `fs`, `os`, `child_process`) at the top level
- All Node.js modules must be **dynamically imported** inside `if (!isMobile())` guards
- `browserPrintManager.ts` already does this correctly with `await import("os")` etc.
- `generatePrintStyles.ts` was fixed — previously had `import path from "path"` which crashed mobile
- The modal (`PrintModeModal`) is desktop-only — `main.ts` skips it on mobile
- Desktop-only settings are hidden on mobile in `settings.ts`

---

## Shared Utilities

### `switchToLightTheme()` — `src/utils/themeSwitch.ts`
Used wherever printing needs light theme (paper is white):
- `advancedPrint.ts`
- `basicPrintPreview.ts` (PrintPreview class)
- `importThemeHeaders.ts` (getCSSVariableValue)

Pattern:
```typescript
const restore = switchToLightTheme();
try {
    // ... work in light theme ...
} finally {
    restore();
}
```

### `isMobile()` — `src/utils/platform.ts`
Wraps `Platform.isMobile` from Obsidian API.

---

## Known Limitations & Future Work

### Advanced Print Selection (Not Working)
The selection printing in advanced mode (`advancedCapturePreview.ts`, lines 59-93) is documented as "Not working!" in the code. The `window.getSelection()` approach doesn't reliably capture selected content from the preview mode. Currently, selection printing falls back to standard mode.

### MathJax/LaTeX Rendering
MathJax styles extraction code was previously removed (see CODE_REVIEW_FIXES.md). MathJax rendering in print output is a known missing feature requested by users.

### Dataview Rendering
Dataview blocks are not rendered in standard mode since `MarkdownRenderer.render()` doesn't process Dataview queries. The advanced mode captures whatever is visible in the preview, which may include Dataview if the plugin is active.

### Metadata Display
Two nearly identical metadata rendering functions exist:
- `addMetadataToContent()` in `normalCapturePreview.ts`
- `addMetadataToPreview()` in `advancedCapturePreview.ts`

These could be unified into a shared utility in a future refactor.

### Unused Dependencies
- `lodash` is declared in `package.json` `dependencies` but is **not imported anywhere** in the source code. It can safely be removed.
- `@types/lodash` can also be removed.

### Context Menu Submenus
A user requested grouping print menu items under a submenu to reduce clutter. The Obsidian API supports `item.setSubmenu()` since v1.4+. This was not implemented in the current refactor but is straightforward to add.

### `generatePreviewContent()` in `normalCapturePreview.ts`
This function (lines 170-211) appears to be unused — it was likely part of the original plugin's architecture. Verify and remove if confirmed.

---

## Build & Testing

- **Build:** `yarn build` (uses esbuild via `scripts/esbuild.config.ts`)
- **Dev:** `yarn dev` (watches for changes)
- **No automated tests** — manual testing in Obsidian required
- **TypeScript strict:** Project uses strict TypeScript with `tsc -noEmit`
- **Line length:** Keep lines ≤ 100 characters (project convention)

### Manual Testing Checklist
- [ ] Desktop: All 3 print modes work
- [ ] Desktop: Modal shows correct buttons
- [ ] Desktop: File/folder/editor context menus work
- [ ] Desktop: Quick print command works
- [ ] Desktop: Settings page shows all options
- [ ] Mobile: Print commands skip modal, go to basic print
- [ ] Mobile: Settings page hides desktop-only options
- [ ] Mobile: No console errors on load
- [ ] Mobile: Basic print preview works
- [ ] Mobile: Print selection works
- [ ] Both: Font settings persist
- [ ] Both: Theme color import works
- [ ] Both: Folder printing works correctly
