# MarkFlow

A block-based WYSIWYG (What You See Is What You Get) Markdown editor designed seamlessly as a Custom Editor for Visual Studio Code. It brings a Notion-like editing experience directly into your favorite code editor.

---

## Features

- Custom Editor - opens `.md` files natively as a block-based visual editor
- Inline block editing - double-click any paragraph or heading to edit raw Markdown
- Blur-to-commit - click outside to apply changes and render instantly
- Inline Undo/Redo - character-by-character history within active text blocks
- Native auto-save - integrates seamlessly with VSCode's file system lifecycle

---

## Usage

| Action                | How-to |
| --------------------- | ---------------------- |
| **Open File**   | Click any `.md` file. If it opens as raw text, right-click the file tab → **Reopen Editor With...** → **MarkFlow Editor**. |
| **Edit Block**  | Double-click any rendered text block (paragraph, heading, etc.) to enter raw Markdown mode. |
| **Save Block**  | Click anywhere outside the active block to render the HTML and sync changes to VSCode. |
| **Inline Undo** | Press `Ctrl+Z` (`Cmd+Z` on Mac) while typing inside a block to undo character-by-character. |
| **Inline Redo** | Press `Ctrl+Y` or `Ctrl+Shift+Z` while typing inside a block to redo. |
| **Global Undo** | Press `Ctrl+Z` outside a block to revert the entire last block edit. |
| **Global Redo** | Press `Ctrl+Y` or `Ctrl+Shift+Z` outside a block to revert the entire last block edit. |

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org)
- [npm](https://npmjs.com)

### Setup

```bash
git clone https://github.com/ihsan-ramadhan/markflow
cd markflow
npm install
```

### Running

```bash
# Build the extension and webview (watch mode)
npm run watch
```

To test the extension:

1. Open the project in VSCode.
2. Press `F5` to open a new Extension Development Host window.
3. Open any `.md` file to see MarkFlow in action.

---

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
