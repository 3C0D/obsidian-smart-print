# Print Title Implementation

## Overview

This document explains how the "Print Title" feature works, including how the inline title is injected and how duplicate H1 headings are removed.

## Feature Behavior

When "Print Title" is enabled:

1. The file name is displayed as a centered title at the top of the print output
2. If the first H1 heading matches the file name, it can be automatically hidden to avoid duplication

## Title Injection

### Normal Capture Mode (`normalCapturePreview.ts`)

The title is injected as an H1 element with the `inline-title` class:

```typescript
// Handle title if requested
if (settings.printTitle && input instanceof TFile) {
	const titleEl = contentSizer.createEl("h1");
	titleEl.textContent = input.basename;
	titleEl.addClass("inline-title");
}
```

**Key points:**

- Created before markdown rendering
- Uses `input.basename` (file name without extension)
- Has class `inline-title` for CSS targeting
- Inserted at the beginning of `contentSizer`

### Advanced Capture Mode (`advancedCapturePreview.ts`)

In advanced capture mode, the title is already present in the cloned DOM from Obsidian's preview.

**Why?** Obsidian's preview already renders the file title when viewing a note. The advanced capture clones this existing DOM, so the title is automatically included.

## Title Styling (`styles.css` + `generatePrintStyles.ts`)

### Base Styling (styles.css)

```css
.obsidian-print .inline-title {
	font-weight: 900;
	text-align: center;
	margin-top: 16px;
	margin-bottom: 24px;
	border-bottom: 2px solid #000;
	padding-bottom: 8px;
}
```

**Visual characteristics:**

- Extra bold (font-weight: 900)
- Centered alignment
- Bottom border for emphasis
- Spacing above and below

### Dynamic Styling (generatePrintStyles.ts)

The title visibility and styling are controlled dynamically based on settings:

```typescript
const titleCSS = settings.printTitle
	? `
.obsidian-print .inline-title {
    display: block !important;
    font-size: ${settings.inlineTitleSize} !important;
    color: ${settings.inlineTitleColor} !important;
}`
	: `
.obsidian-print .inline-title {
    display: none !important;
}`;
```

**Dynamic properties:**

- `display`: Shown or hidden based on `printTitle` setting
- `font-size`: User-configurable via `inlineTitleSize` setting
- `color`: User-configurable via `inlineTitleColor` setting

## Duplicate H1 Removal

### The Problem

When "Print Title" is enabled, users often have a duplicate heading:

1. The inline title (file name): "My Document"
2. The first H1 in the markdown: `# My Document`

This creates visual redundancy in the print output.

### The Solution: Hide H1 if Same as Title

The `hideH1IfSameAsTitle` setting (default: `true`) automatically removes the first H1 if it matches the file name.

### Implementation in Normal Capture (`normalCapturePreview.ts`)

After markdown rendering, check and remove duplicate H1:

```typescript
// Store title for later comparison
const titleText =
	input instanceof TFile ? input.basename.toLowerCase().trim() : "";

// ... markdown rendering ...

// Remove first H1 if it duplicates the inline title
if (
	settings.printTitle &&
	settings.hideH1IfSameAsTitle &&
	input instanceof TFile
) {
	const firstH1 = contentSizer.querySelector("h1:not(.inline-title)");
	if (firstH1 && firstH1.textContent?.toLowerCase().trim() === titleText) {
		firstH1.remove();
	}
}
```

**Logic:**

1. Store the file basename (title) before rendering
2. After rendering, query for the first H1 (excluding `.inline-title`)
3. Compare text content (case-insensitive, trimmed)
4. Remove if they match

### Implementation in Advanced Capture (`advancedCapturePreview.ts`)

After cloning the DOM, check and remove duplicate H1:

```typescript
const clonedSizer = originalSizer.cloneNode(true) as HTMLElement;
container.appendChild(clonedSizer);

// Remove first H1 if it duplicates the file title
if (settings.printTitle && settings.hideH1IfSameAsTitle) {
	const activeFile = app.workspace.getActiveFile();
	if (activeFile) {
		const titleText = activeFile.basename.toLowerCase().trim();
		const firstH1 = clonedSizer.querySelector("h1:not(.inline-title)");
		if (
			firstH1 &&
			firstH1.textContent?.toLowerCase().trim() === titleText
		) {
			firstH1.remove();
		}
	}
}
```

**Why both implementations?**

- Normal capture: Used for non-active files, selections, or when comments are shown
- Advanced capture: Used for active files (preserves Mermaid, LaTeX, etc.)

## User Interface

### Print Modal (`PrintModeModal.ts`)

The UI uses a nested checkbox pattern:

```typescript
// Parent checkbox: Print Title
const titleLabel = titleWrapper.createEl("label");
const titleCheck = titleLabel.createEl("input", { type: "checkbox" });
titleCheck.checked = this.settings.printTitle;
titleLabel.appendText(" Print Title");

// Child checkbox: Hide H1 if same as title (indented, smaller font)
const hideH1Label = titleWrapper.createEl("label");
hideH1Label.style.display = this.settings.printTitle ? "flex" : "none";
hideH1Label.style.fontSize = "11px";
hideH1Label.style.paddingLeft = "16px";
const hideH1Check = hideH1Label.createEl("input", { type: "checkbox" });
hideH1Check.checked = this.settings.hideH1IfSameAsTitle;
hideH1Label.appendText(" Hide H1 if same as title");
```

**Visual hierarchy:**

- Parent: "Print Title" (normal size)
- Child: "Hide H1 if same as title" (smaller, indented)
- Child visibility: Only shown when parent is checked

### Settings Panel (`settings.ts`)

Only "Print note title" toggle is shown in settings:

```typescript
new Setting(containerEl)
    .setName("Print note title")
    .setDesc("Include the note title in the printout.")
    .addToggle((toggle) => ...);
```

**Design decision:** The "Hide H1" option is only in the print modal, not in global settings, because it's a contextual choice users make per-print.

## Flow Diagram

```
User enables "Print Title"
         ↓
┌────────────────────────────────────┐
│  Normal Capture Mode               │  Advanced Capture Mode
├────────────────────────────────────┤
│ 1. Create H1 with .inline-title    │  1. Clone DOM (title already exists)
│ 2. Render markdown content         │  2. Check hideH1IfSameAsTitle
│ 3. Check hideH1IfSameAsTitle       │  3. Remove first H1 if duplicate
│ 4. Remove first H1 if duplicate    │
└────────────────────────────────────┘
         ↓
generatePrintStyles.ts applies CSS
    - Show/hide inline-title
    - Apply size and color
         ↓
Print output with title (no duplicate H1)
```

## Key Design Decisions

### Why `.inline-title` Class?

The class name matches Obsidian's convention for the file title shown in the editor. This provides:

- Consistency with Obsidian's naming
- Easy CSS targeting with `:not(.inline-title)` selector
- Clear semantic meaning

### Why Case-Insensitive Comparison?

```typescript
firstH1.textContent?.toLowerCase().trim() === titleText;
```

Users might write:

- File name: `My Document`
- H1 heading: `# my document` or `# MY DOCUMENT`

Case-insensitive comparison treats these as duplicates, which is the expected behavior.

### Why Remove Instead of Hide?

```typescript
firstH1.remove();
```

Instead of `display: none`, we remove the element from the DOM because:

- Cleaner HTML output
- No risk of CSS conflicts
- Smaller print payload
- No accessibility issues with hidden content

### Why Both Capture Modes?

**Normal capture** is used when:

- File is not currently active
- User wants to show comments (requires markdown pre-processing)
- Selection printing

**Advanced capture** is used when:

- File is currently active
- Better rendering quality (preserves Mermaid, LaTeX, complex layouts)
- Faster (clones existing DOM instead of re-rendering)

Both need the duplicate H1 removal logic to ensure consistent behavior.

## Files Modified

| File                                          | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `src/types.ts`                                | Added `printTitle` and `hideH1IfSameAsTitle` settings |
| `src/normalCapturePreview.ts`                 | Title injection + H1 removal (normal capture)         |
| `src/advancedPrint/advancedCapturePreview.ts` | H1 removal (advanced capture)                         |
| `src/PrintModeModal.ts`                       | Nested checkbox UI                                    |
| `src/settings.ts`                             | "Print note title" toggle                             |
| `src/getStyles/generatePrintStyles.ts`        | Dynamic title CSS generation                          |
| `styles.css`                                  | Base `.inline-title` styling                          |

## Testing

To test the feature:

1. Create a note named "Test Document" with content:

    ```markdown
    # Test Document

    This is the content.
    ```

2. Enable "Print Title" in print modal
3. Expected result: Only one "Test Document" title appears (the inline title)

4. Disable "Hide H1 if same as title"
5. Expected result: Two "Test Document" titles appear (inline + H1)

6. Change H1 to different text:
    ```markdown
    # Different Heading
    ```
7. Expected result: Both "Test Document" (inline) and "Different Heading" (H1) appear
