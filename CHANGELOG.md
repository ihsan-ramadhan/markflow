# Change Log

## [1.1.1] - May 26th, 2026

### Fixed
- Fixed infinite loading issue in webview by correcting the custom editor viewType registration.

## [1.1.0] - May 26th, 2026

### Added
- **Floating Formatting Toolbar**: Quick styling popup (Bold, Italic, Strikethrough, Link) on text selection with smart format toggling.
- **Slash Commands (`/`)**: Easily trigger block type insertion by typing `/` in empty paragraphs.
- **Keyboard Navigation**: Move visual selection with `ArrowUp` / `ArrowDown` and press `Enter` to edit selected blocks.
- **Notion-Style Multi-Block Selection**: Support selecting multiple blocks using `Ctrl/Cmd + Click`, `Shift + Click`, and `Ctrl/Cmd + A`.
- **Clipboard & Batch Operations**: Copy (`Ctrl+C`), cut (`Ctrl+X`), or delete (`Delete`/`Backspace`) multiple blocks simultaneously.
- **Block Insertion Controls**: Added hover `+` insertion button and a bottom "+ Add Block" button.
- **Edit Mode Shortcuts**: Integrated shortcuts (`Tab`/`Shift+Tab` to navigate, `Ctrl+Enter` to add block, `Escape` to save).

### Changed
- **Architectural Overhaul**: Migrated extension backend to `vscode.CustomTextEditorProvider` for native workspace file synchronization, undo/redo handling, and auto-save integration.
- **Renamed to Markblock**: Renamed the extension from MarkFlow to Markblock to represent the block-based editing experience.
- **Placeholder Improvements**: Added background instruction guide ("Ketik '/' untuk memunculkan perintah...") for empty blocks.

### Fixed
- **Auto-Selection Fix**: Fixed editor state so it automatically restores focus and selects the active block when exiting edit mode (`Escape` or `Enter`).
- **Whitespace Clean-up**: Resolved trailing newline duplication and git-diff bloating on block updates.
- **Deletion Keyboard Handler**: Backspace on an empty block now safely removes the block and shifts cursor focus to the preceding block.
