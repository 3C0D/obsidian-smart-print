# Show Comments Implementation

## Overview

This document explains how the "Show Comments" feature was implemented to display Obsidian comments (`%% ... %%`) in print output.

## The Challenge

Obsidian comments (`%% ... %%`) are stripped by Obsidian's markdown parser before HTML is generated. This means:

- Comments never appear in the DOM
- CSS cannot make them visible
- Direct HTML injection is escaped by the renderer

## Solution Architecture

The implementation uses a **two-phase approach** with capture strategy bypass:

### 1. Capture Strategy Bypass (`captureStrategy.ts`)

When `showComments` is enabled, we bypass the advanced DOM capture:

```typescript
const canUseAdvanced =
	(!file || file.path === activeFile?.path) && !settings.showComments;
```

**Why?** Advanced capture clones the already-rendered DOM where comments are already stripped.

### 2. Pre-processing Phase (`normalCapturePreview.ts`)

Before markdown rendering, convert comments to inline code placeholders:

```typescript
if (settings.showComments) {
	markdownContent = markdownContent.replace(
		/%%(.+?)%%/gs,
		(_, content) => `\`[comment: ${content.trim()}]\``,
	);
}
```

**Why inline code?**

- Markdown code syntax (`` `...` ``) is always rendered by Obsidian
- It survives the markdown parser as `<code>` elements
- We can identify and replace them in post-processing

### 3. Post-processing Phase (`normalCapturePreview.ts`)

After markdown rendering, replace code placeholders with styled spans:

```typescript
if (settings.showComments) {
	contentSizer.querySelectorAll("code").forEach((code) => {
		if (code.textContent?.startsWith("[comment: ")) {
			const span = document.createElement("span");
			span.className = "obsidian-comment";
			span.textContent = code.textContent
				.replace("[comment: ", "")
				.replace(/\]$/, "");
			code.replaceWith(span);
		}
	});
}
```

### 4. Visual Styling (`styles.css`)

Style the comment spans with distinctive appearance:

```css
.obsidian-print .obsidian-comment {
	background-color: #fffbe6;
	border: 1px dashed #cca800;
	border-radius: 3px;
	padding: 0 4px;
	color: #7a6000;
	font-size: 0.9em;
}
```

## User Interface

### Settings Panel (`settings.ts`)

Added toggle in plugin settings:

```typescript
new Setting(containerEl)
    .setName("Show comments")
    .setDesc(
        "Display Obsidian comments (%% ... %%)" +
        " in the printout. Comments will appear" +
        " with a yellow background.",
    )
    .addToggle((toggle) => ...);
```

### Print Modal (`PrintModeModal.ts`)

Added checkbox in quick print options:

```typescript
const commentsLabel = container.createEl("label");
const commentsCheck = commentsLabel.createEl("input", { type: "checkbox" });
commentsCheck.checked = this.settings.showComments;
commentsLabel.appendText(" Show comments");
commentsLabel.title = "Show Obsidian comments (%% ... %%) in print output";
```

## Type Definitions (`types.ts`)

Added to interface and defaults:

```typescript
export interface SmartPrintPluginSettings {
	/** Show Obsidian comments (%% ... %%) in print output */
	showComments: boolean;
}

export const DEFAULT_SETTINGS = {
	showComments: false,
	// ...
};
```

## Flow Diagram

```
User enables "Show comments"
         ↓
captureStrategy.ts: Bypass advanced capture
         ↓
normalCapturePreview.ts: Pre-processing
    %% comment %% → `[comment: comment]`
         ↓
MarkdownRenderer.render()
    `[comment: comment]` → <code>[comment: comment]</code>
         ↓
normalCapturePreview.ts: Post-processing
    <code>[comment: ...]</code> → <span class="obsidian-comment">...</span>
         ↓
styles.css: Apply visual styling
    Yellow background, dashed border
         ↓
Print output with visible comments
```

## Key Design Decisions

### Why Not CSS-Only?

Comments are stripped before HTML generation. CSS cannot display elements that don't exist in the DOM.

### Why Not Direct HTML Injection?

Obsidian's `MarkdownRenderer.render()` escapes inline HTML for security. `<span>` tags would appear as literal text.

### Why Inline Code Placeholders?

- Markdown code syntax is always rendered
- Creates identifiable DOM nodes (`<code>`)
- Allows safe post-processing replacement

### Why Bypass Advanced Capture?

Advanced capture (`getRenderedContent`) clones the live DOM where comments are already stripped by Obsidian's renderer.

## Files Modified

| File                          | Changes                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `src/types.ts`                | Added `showComments: boolean` to interface and defaults       |
| `src/captureStrategy.ts`      | Bypass advanced capture when `showComments` is true           |
| `src/normalCapturePreview.ts` | Pre-processing (regex) and post-processing (DOM manipulation) |
| `src/PrintModeModal.ts`       | Added "Show comments" checkbox                                |
| `src/settings.ts`             | Added "Show comments" toggle in settings panel                |
| `styles.css`                  | Added `.obsidian-comment` styling                             |

## Testing

To test the feature:

1. Create a note with Obsidian comments:

    ```markdown
    This is visible text.
    %% This is a comment %%
    More visible text.
    ```

2. Enable "Show comments" in:
    - Plugin settings, OR
    - Print modal checkbox

3. Print or preview the note

4. Expected result: Comments appear with yellow background and dashed border

## Limitations

- Comments in advanced capture mode (live DOM) cannot be shown
- Multi-line comments are supported via regex flag `s` (dotall)
- Comments containing backticks may interfere with placeholder detection

## Future Improvements

- Add option to customize comment styling (color, border)
- Support different comment markers
- Add comment prefix/suffix in output (e.g., "Comment: ...")
