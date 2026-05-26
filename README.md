# Markblock

A block-based WYSIWYG (What You See Is What You Get) Markdown editor designed seamlessly as a Custom Editor for Visual Studio Code. It brings a Notion-like editing experience directly into your favorite code editor.

---

## Features

- **Custom Editor Integration** - Works natively as a VS Code custom editor for `.md` files.
- **Inline WYSIWYG Editing** - Seamless editing experience without separate preview panes.
- **Slash Command Menu** - Dynamic command menu to insert headings, lists, code blocks, tables, callouts, and media blocks quickly.
- **Keyboard-First Design** - Efficient navigation, block creation, and focus management using key shortcuts.
- **Multi-Block Actions** - Select, copy, cut, delete, and manage multiple blocks simultaneously.
- **Floating Formatting Toolbar** - Instant text formatting options upon selection.
- **Native Document Integration** - Full support for VS Code's Undo/Redo history and filesystem sync.

---

## Usage & Shortcuts

### 1. Editing Blocks
| Action | Key / Gesture | Description |
| --- | --- | --- |
| **Start Editing** | Double-click or select block + `Enter` | Opens raw Markdown editor for the selected block. |
| **Save & Exit** | `Escape` or Click outside | Saves your changes, parses markdown, and returns to preview mode. |
| **Cycle Next Block** | `Tab` | Saves the current block and edits the block below. |
| **Cycle Prev Block** | `Shift+Tab` | Saves the current block and edits the block above. |

### 2. Block Insertion & Deletion
| Action | Key / Gesture | Description |
| --- | --- | --- |
| **Add Block Below** | `Ctrl+Enter` (while editing) | Saves the current block, inserts a new empty paragraph below, and focuses it. |
| **Add Block (Hover)** | Click `+` on block hover | Inserts a new empty paragraph directly below the hovered block. |
| **Add Block (Bottom)**| Click `+ Add Block` at bottom | Inserts a new paragraph block at the end of the document. |
| **Delete Block (Hover)**| Click `🗑️` on block hover | Instantly deletes the hovered block. |
| **Delete Block (Key)** | `Backspace` (on empty block) | Deletes the active empty block and focus shifts to the previous block. |

### 3. Multi-Block Selection (Preview Mode)
| Action | Key / Gesture | Description |
| --- | --- | --- |
| **Toggle Selection** | `Ctrl + Click` (`Cmd + Click` on Mac) | Selects/deselects specific blocks individually. |
| **Select Range** | `Shift + Click` | Selects a range of blocks between the last selected block and the clicked block. |
| **Select All** | `Ctrl+A` (`Cmd+A` on Mac) | Selects all blocks in the document. |
| **Cancel Selection** | `Escape` or Click empty area | Deselects all currently selected blocks. |

### 4. Selection Actions & Navigation
| Action | Key / Gesture | Description |
| --- | --- | --- |
| **Move Focus** | `ArrowUp` / `ArrowDown` | Moves the block selection highlight up or down. Auto-scrolls block into view. |
| **Mass Delete** | `Delete` or `Backspace` | Deletes all selected blocks at once. |
| **Mass Copy** | `Ctrl+C` (`Cmd+C` on Mac) | Copies raw Markdown content of all selected blocks to clipboard. |
| **Mass Cut** | `Ctrl+X` (`Cmd+X` on Mac) | Copies raw Markdown of selected blocks, then deletes the blocks. |

### 5. Slash Command Menu (`/`)
*Type `/` at the start of a block or after a space while editing to open the menu.*
- **Navigation**: Use `ArrowUp` / `ArrowDown` to highlight options.
- **Select**: Press `Enter` or click the option to insert it.
- **Close**: Press `Escape` or type to filter out.
- **Available Blocks**: Headings (1-3), Bulleted Lists, Numbered Lists, Checklists, Images, Videos, Files, Code Blocks, Tables, Blockquotes, Dividers, and Callouts.

### 6. Floating Formatting Toolbar
*Highlight text selection inside a block while editing to trigger the toolbar.*
- **Bold**: Toggle bold formatting (`**text**`).
- **Italic**: Toggle italic formatting (`*text*`).
- **Strikethrough**: Toggle strikethrough formatting (`~~text~~`).
- **Link**: Wrap selected text in Markdown link template (`[text](url)`).

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org)
- [npm](https://npmjs.com)

### Setup

```bash
git clone https://github.com/ihsan-ramadhan/markblock.git
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
3. Open any `.md` file to see Markblock in action.

---

Commits follow [Conventional Commits](https://www.conventionalcommits.org).
