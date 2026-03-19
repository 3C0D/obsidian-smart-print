Print rendering improvements

Advanced rendering (Mermaid, Dataview, LaTeX...) now works consistently across all print entry points: ribbon, editor menu, file explorer, reading mode, and folder print.

- Fixed metadata appearing above the title when both "Show Title" and "Show Metadata" are enabled
- Fixed advanced rendering not triggering when the note was not focused
- Optimized capture strategy: temporary files are now only created for selection capture. All other print modes reuse open leaves or open the file directly
- "Combine notes" checkbox in the folder print modal now has a visual indicator when active