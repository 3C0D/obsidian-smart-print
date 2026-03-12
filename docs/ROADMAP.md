# Smart Print — Roadmap

**Last updated:** 2026-03-12

---

## ✅ Implemented (this session)

### Issue #2 (obsidian-smart-print) — UX improvements
- [x] **Ribbon icon toggle** — `showRibbonIcon` setting
      Adds/removes the printer icon dynamically
- [x] **Context menu toggle** — `showContextMenu` setting
      Disables right-click entries entirely  
- [x] **Submenu grouping** — `useSubmenu` setting
      Groups all entries under "Smart Print" submenu
- [x] **Skip preview** — `skipPreview` setting
      Prints directly without preview window
- [x] **Color / B&W** — `printInColor` setting
      Forces all text to black when disabled

### Mobile compatibility (from obsidian-print issues)
- [x] Fixed crash from Node.js `path` import
- [x] Mobile skips modal, goes to basic print
- [x] Desktop-only settings hidden on mobile

### Code quality
- [x] Shared `switchToLightTheme()` utility
- [x] Fixed `folderPrint` regression
- [x] Improved JSDoc
- [x] 100-char line limit enforced

---

## 🔜 Next Steps (prioritized)

### High Priority

#### Community submission preparation
- [ ] Test thoroughly on both desktop and mobile
- [ ] Clean up `package.json` (remove unused `lodash`)
- [ ] Remove unused `generatePreviewContent()` function
- [ ] Ensure `manifest.json` version matches
- [ ] Prepare README with features, screenshots, etc.
- [ ] Submit to Obsidian community plugins repo

### Medium Priority

#### Rendering improvements
- [ ] **LaTeX/MathJax** — Investigate MathJax rendering
      in print output. Complex: would need to include
      MathJax library or capture rendered output.
      *Workaround:* Advanced mode captures whatever the
      preview renders, including MathJax if enabled.

- [ ] **Dataview** — Similar to MathJax. Advanced mode
      already captures rendered Dataview if visible
      in preview mode.

- [ ] **MetaBind** — Same approach as Dataview. Advanced
      mode should capture rendered content.

- [ ] **Images** — Verify image rendering in all modes.
      Basic mode should embed images as data URIs for
      reliable printing.

#### UX improvements
- [ ] **Color/B&W in modal** — Add color/B&W toggle
      to the PrintModeModal for quick switching without
      going to settings.

- [ ] **Mobile print options** — Consider an intermediate
      dialog (lighter than the full modal) for mobile
      with: Color/B&W, Print title, Show metadata.

- [ ] **Better document title** — Ensure the print
      document title in browser mode is just the filename,
      not "Obsidian Vault X - Obsidian v1.x.x".
      *Location:* `browserPrintManager.ts` → the
      `<title>` tag in `createPrintableHtml()`.

### Low Priority

- [ ] **Other export formats** — PDF export, HTML export.
      Would require additional libraries. Browser mode
      already supports PDF via "Save as PDF" in the
      browser print dialog.

- [ ] **Print header/footer** — Page numbers, document
      name. CSS `@page` rules can do this but browser
      support varies.

- [ ] **Unified metadata renderer** — Extract into
      shared utility (normalCapturePreview +
      advancedCapturePreview have near-identical code).

- [ ] **Advanced selection printing** — Currently
      broken. Would require a different approach to
      capture selected text from preview mode.

---

## 📊 Issue Status Matrix

### obsidian-print (original) issues

| # | Issue | Status in Smart Print |
|---|---|---|
| #1 | Rendering — Dataview, MetaBind, math | ⚠️ Advanced mode captures rendered content |
| #9 | Metadata not printing | ✅ Implemented (`showMetadata` setting) |
| #17 | Mermaid shown as code | ✅ Fixed in advanced mode |
| #21 | LaTeX not rendered | ⚠️ Advanced mode captures if MathJax loaded |
| #22 | Plugin CSS not applied | ✅ Theme colors imported; `generatePrintStyles` |
| #24 | Title includes Obsidian info | 🔜 Fixable in `createPrintableHtml()` |
| #25 | Nested checkboxes not indented | ✅ Fixed in `styles.css` |
| #26 | Spaces between checkbox blocks | ✅ Fixed in `styles.css` |

### obsidian-smart-print issues

| # | Issue | Status |
|---|---|---|
| #2 | Community submission + UX | ✅ UX done, submission pending |

---

## 🏗️ Architecture Notes for Future Work

### Print engines comparison

```
┌─────────────┬────────────────────┬──────────────┐
│             │ Basic (Printd)     │ Browser      │
├─────────────┼────────────────────┼──────────────┤
│ Platform    │ Desktop + Mobile   │ Desktop only │
│ Rendering   │ Limited (Electron) │ Full browser │
│ Mermaid     │ ❌ No              │ ✅ Advanced  │
│ LaTeX       │ ❌ No              │ ⚠️ If loaded │
│ Dataview    │ ❌ No              │ ⚠️ Advanced  │
│ Color       │ via CSS setting    │ via browser  │
│ B&W         │ via CSS setting    │ via browser  │
│ PDF export  │ ❌ No              │ ✅ Save as   │
│ Speed       │ Fast               │ Slower       │
└─────────────┴────────────────────┴──────────────┘
```

### File flow

```
User action → main.ts (handlePrint)
    ├─ Mobile → basicPrint() → Printd
    └─ Desktop
        ├─ useModal? → PrintModeModal
        │   ├─ "basic" → basicPrint() → preview → Printd
        │   ├─ "standard" → contentToHTML → browserPrint
        │   └─ "advanced" → captureDOM → browserPrint
        └─ !useModal
            ├─ useBrowser → standardPrint → browserPrint
            └─ !useBrowser → basicPrint → Printd
```
