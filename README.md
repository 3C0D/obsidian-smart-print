# Obsidian Smart Print

Enhanced and customizable printing for Obsidian notes, with advanced options, live preview, and full control over fonts, headers, and styles.

## Quick Start

1. **Install the plugin** and enable it
2. **Click the print ribbon icon** or use the command palette
3. **Choose your print mode** in the modal that appears
4. **Customize settings** if needed, then print!

## Features

### 🖨️ Three Printing Modes

When you print a note, a modal appears with three options:

| Mode         | Description                               | Best For                             |
| ------------ | ----------------------------------------- | ------------------------------------ |
| **Basic**    | Direct printing within Obsidian           | Quick prints, simple notes           |
| **Standard** | Browser-based with standard options       | Most common use cases                |
| **Advanced** | Enhanced rendering for complex elements\* | Notes with diagrams, callouts, icons |

> \*Advanced mode handles Mermaid diagrams, callouts, and icons better but doesn't support MathJax formulas.

### 📋 Print Options Modal

![Print Modal](assets/modal.png)

Every print command opens this unified modal where you can:

- **Choose your print mode** (Basic/Standard/Advanced)
- **Quick toggles** for common options:
  - Include note title
  - Show metadata
  - Page breaks at horizontal rules (`---`)
- **Font settings** with 20+ cross-platform font options
- **Auto-sync heading sizes:** When enabled, all heading sizes automatically adjust when you change the base font size

### 🎯 Multiple Ways to Print

**From anywhere in Obsidian:**

- **Ribbon icon** → Print current note
- **Command palette** → Search "Smart Print"
- **Right-click** on files/folders → Print options
- **Right-click** in editor → Print note or selection

**What you can print:**

- **Current note** (active document)
- **Selected text only** (from editor)
- **All notes in a folder** (combined or separate pages)

> **Note:** The print modal adapts to your choice - it will show the appropriate options for note, selection, or folder printing.

### 🎨 Customization Options

**Quick customization** (in print modal):

- Font family and size
- Common print options

**Advanced customization** (in plugin settings):

- Individual heading sizes and colors
- Import colors from your current theme
- Custom CSS with `.obsidian-print` prefix
- Auto-sync heading sizes when base font changes

### 👀 Preview Before Printing

- **All modes** show a preview before printing
- **Browser modes** (Standard/Advanced) open in full window
- **Tip:** Close the print dialog to keep the preview open, then press `Ctrl+P` to reopen print options

## Settings Guide

### Font & Typography

- **Font family:** Choose from 20+ cross-platform fonts (Arial, Times, Roboto, Ubuntu, Georgia, and many more)
- **Font size:** Base size with automatic heading synchronization option
- **Auto-sync headings:** When enabled, changing the base font size automatically adjusts all heading sizes proportionally
- **Individual heading sizes:** Fine-tune each heading level (H1-H6) independently

### Colors & Styling

- **Header colors:** Set individual colors for each heading level
- **Import theme colors:** One-click import from your current theme (light mode)
- **Custom CSS:** Advanced styling with `.obsidian-print` prefix

### Print Behavior

- **Page breaks:** Treat horizontal rules (`---`) as page breaks
- **Metadata display:** Include/exclude frontmatter in prints
- **Folder printing:** Combine all notes or separate pages

## Tips & Tricks

💡 **For best results with custom colors:** Set header colors in plugin settings first, then use the print modal

💡 **Theme integration:** Use "Get theme colors" in settings to match your Obsidian theme

💡 **Auto-sync workflow:** Enable "Auto-sync heading sizes" for consistent typography – all headings automatically scale when you change the base font size.  
Once this option is checked, heading sizes are kept in sync automatically—there is no need to adjust them manually.

💡 **Font variety:** The plugin includes web-safe fonts and popular options like Roboto, Ubuntu, Georgia, and Fira Code for different document styles

💡 **Custom styling:** Create advanced layouts with custom CSS using `.obsidian-print` selectors

💡 **Selection printing:** When printing selections, the plugin defaults to Standard mode for better formatting

💡 **Quick workflow:** Most users will only need the print modal - settings are for fine-tuning
