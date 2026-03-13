# Obsidian Smart Print

Enhanced and customizable printing for Obsidian notes, with intelligent rendering, live preview, and full control over fonts, headers, and styles.

## Quick Start

1. **Install the plugin** and enable it
2. **Click the print ribbon icon** or use the command palette
3. **Adjust options** in the modal (optional)
4. **Print!** The plugin automatically uses the best rendering method

## Features

### 🎯 Intelligent Printing

Smart Print automatically chooses the best rendering method for your content:

- **Advanced DOM capture** for complex elements (Mermaid diagrams, Dataview queries, callouts, dynamic plugins)
- **Automatic fallback** to standard rendering if needed
- **No mode selection required** - just click Print!

**What renders perfectly:**

- ✅ Mermaid diagrams
- ✅ Dataview queries (when visible in preview)
- ✅ Callouts with icons
- ✅ Tables, lists, code blocks
- ✅ Images and links
- ✅ Nested checkboxes with proper indentation
- ✅ Custom theme colors

### 📋 Print Options Modal

![Print Modal](assets/modal.png)

Every print command opens a simple modal where you can:

- **Quick toggles** for common options:
    - Include note title
    - Show metadata
    - Page breaks at horizontal rules (`---`)
    - Print in color or black & white
- **Font settings** with 20+ cross-platform font options
- **Auto-sync heading sizes:** All heading sizes automatically adjust when you change the base font size

### 🎯 Multiple Ways to Print

**From anywhere in Obsidian:**

- **Ribbon icon** → Print current note
- **Command palette** → Search "Smart Print"
    - "Current note" - Print with modal
    - "Quick print" - Print immediately without modal
    - "Selection" - Print selected text only
    - "All notes in current folder" - Batch print
- **Right-click** on files/folders → Print options
- **Right-click** in editor → Print note or selection

**What you can print:**

- **Current note** (active document)
- **Selected text only** (from editor)
- **Any note** (from file explorer)
- **All notes in a folder** (combined or separate pages)

### 🎨 Customization Options

**Quick customization** (in print modal):

- Font family and size
- Print title, metadata, page breaks
- Color or black & white output

**Advanced customization** (in plugin settings):

- Individual heading sizes and colors
- Import colors from your current theme
- Custom CSS with `.obsidian-print` prefix
- Auto-sync heading sizes when base font changes
- UI preferences (ribbon icon, context menus, modals)

### 📱 Mobile Support

- ✅ Full support on iOS and Android
- ✅ Optimized for mobile printing
- ✅ Streamlined interface on mobile devices

### 👀 Preview Before Printing

- **Desktop:** Browser preview with full print options
- **Mobile:** In-app preview with print dialog
- **Tip:** Close the print dialog to keep the preview open, then press `Ctrl+P` (or `Cmd+P`) to reopen print options

## Settings Guide

### Font & Typography

- **Font family:** Choose from 20+ cross-platform fonts (Arial, Times, Roboto, Ubuntu, Georgia, Fira Code, and many more)
- **Font size:** Base size with automatic heading synchronization option
- **Auto-sync headings:** When enabled, changing the base font size automatically adjusts all heading sizes proportionally
- **Individual heading sizes:** Fine-tune each heading level (H1-H6) independently

### Colors & Styling

- **Header colors:** Set individual colors for each heading level
- **Import theme colors:** One-click import from your current theme (light mode)
- **Print in color:** Toggle between color and black & white output
- **Custom CSS:** Advanced styling with `.obsidian-print` prefix (desktop only)
    - Create a `print.css` file in `.obsidian/snippets/`
    - Use `.obsidian-print` as prefix for your selectors
    - Example: `.obsidian-print a { color: blue; text-decoration: underline; }`
    - No need for `!important` - your styles will apply automatically
    - The "Print in color" toggle in the modal will still work as expected

### Print Behavior

- **Page breaks:** Treat horizontal rules (`---`) as page breaks
- **Metadata display:** Include/exclude frontmatter in prints
- **Folder printing:** Combine all notes or separate pages
- **Skip preview:** Print directly without preview window

### UI & UX

- **Show ribbon icon:** Toggle printer icon in left sidebar
- **Show context menu items:** Enable/disable right-click print options
- **Group in submenu:** Organize context menu items under "Smart Print" submenu
- **Show print mode selection:** Display options modal before printing (desktop only)
- **Show folder print options modal:** Display options when printing folders

## Tips & Tricks

💡 **Best rendering:** The plugin automatically uses advanced DOM capture for the best results with complex content

💡 **Theme integration:** Use "Get theme colors" in settings to match your Obsidian theme

💡 **Auto-sync workflow:** Enable "Auto-sync heading sizes" for consistent typography – all headings automatically scale when you change the base font size

💡 **Font variety:** The plugin includes web-safe fonts and popular options like Roboto, Ubuntu, Georgia, and Fira Code for different document styles

💡 **Custom styling:** Create a `print.css` file in `.obsidian/snippets/` with `.obsidian-print` selectors. No `!important` needed - your styles apply automatically and respect the "Print in color" toggle

💡 **Quick printing:** Use "Quick print" command to skip the modal and print immediately

💡 **Folder printing:** Print entire folders with a dedicated modal for batch options

💡 **Mobile friendly:** Full feature support on mobile devices with optimized interface

## Technical Details

### Rendering Strategy

Smart Print uses an intelligent capture strategy:

1. **Tries advanced DOM capture** - Captures the live preview exactly as you see it
2. **Falls back gracefully** - Uses standard Markdown rendering if DOM capture fails
3. **Handles edge cases** - Special handling for selections and non-active files

### Platform Support

- **Desktop:** Full feature set with browser-based printing
- **Mobile:** Optimized printing with in-app preview
- **Cross-platform fonts:** Carefully selected fonts that work on all platforms

### Print Engines

- **Browser print** (desktop): Opens in system browser for maximum compatibility and options
- **Printd** (mobile/desktop): In-app printing with Electron/mobile print dialog

## Troubleshooting

**Dynamic content not rendering?**

- Make sure the note is open in preview mode
- For Dataview/MetaBind, ensure the plugin is enabled and content is visible

**Wrong file printed from explorer?**

- This is now fixed - the plugin correctly identifies the target file

**Theme colors not applied?**

- Use "Get theme colors" button in settings to import your theme's colors

**Print dialog not appearing?**

- Check that "Skip preview" is disabled in settings
- On mobile, ensure you have print permissions

## Contributing

Contributions are welcome! Please check the [development documentation](docs/DEVELOPMENT.md) for details.

## License

MIT License - See LICENSE file for details

## Credits

Developed with ❤️ for the Obsidian community

---

**Version:** 1.0.0  
**Minimum Obsidian version:** 1.4.0  
**Tested on:** Obsidian 1.5.x, 1.6.x
