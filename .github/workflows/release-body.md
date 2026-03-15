## v2.1.0

### New Features
- **Print Selection (Advanced)** — Selection printing now uses the same advanced rendering engine as Print Note, with full support for Mermaid, LaTeX, Dataview, and custom theme colors
- **Print Folder (Advanced)** — Folder printing upgraded to advanced rendering engine on desktop
- **Adaptive print modal** — Modal title now reflects the active print command (Print Note, Print Selection, Print Folder)
- **Hide images / Hide embedded notes** — New toggles in the print modal, shown only when relevant content is detected in the document
- **Automatic theme color detection** — Heading and title colors are now extracted directly from the rendered DOM in light mode, no longer requiring an open document with all heading levels

### Fixes
- **Print width consistency** — Print output no longer varies based on Obsidian window width
- **Metadata positioning** — Frontmatter now consistently appears at the top of the document across all print modes
- **Embedded images** — Images using `![[...]]` syntax now render correctly in folder and selection prints
- **Temporary files cleanup** — Temp files used during advanced rendering are now properly deleted after use, including the temp folder

### Notes
- Plugin is desktop-only in this release. Mobile support is planned.