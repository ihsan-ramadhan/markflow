import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import * as crypto from 'crypto';
export type BlockType = 'heading' | 'paragraph' | 'list' | 'code' | 'table' | 'blockquote' | 'hr' | 'image';
export interface Block {
  id: string;
  type: BlockType;
  raw: string;
  html: string;
  position: {
    start: { line: number; column: number; offset?: number };
    end: { line: number; column: number; offset?: number };
  };
  meta?: {
    level?: number;
    lang?: string;
    ordered?: boolean;
  };
}
function generateUUID(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'block-' + Math.random().toString(36).substring(2, 15);
}
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
export function markdownToBlocks(content: string): Block[] {
  if (!content || !content.trim()) {
    return [];
  }
  const processor = unified().use(remarkParse).use(remarkGfm);
  const ast = processor.parse(content);
  const blocks: Block[] = [];
  const children = ast.children;
  for (const node of children) {
    const pos = node.position;
    if (!pos) continue;
    let raw = '';
    if (typeof pos.start.offset === 'number' && typeof pos.end.offset === 'number') {
      raw = content.slice(pos.start.offset, pos.end.offset);
    } else {
      const lines = content.split(/\r?\n/);
      raw = lines.slice(pos.start.line - 1, pos.end.line).join('\n');
    }
    let type: BlockType = 'paragraph';
    const meta: Block['meta'] = {};
    switch (node.type) {
      case 'heading':
        type = 'heading';
        meta.level = (node as any).depth;
        break;
      case 'list':
        type = 'list';
        meta.ordered = (node as any).ordered;
        break;
      case 'code':
        type = 'code';
        meta.lang = (node as any).lang || undefined;
        break;
      case 'blockquote':
        type = 'blockquote';
        break;
      case 'thematicBreak':
        type = 'hr';
        break;
      case 'table':
        type = 'table';
        break;
      case 'paragraph':
        const pChildren = (node as any).children || [];
        if (pChildren.length === 1 && pChildren[0].type === 'image') {
          type = 'image';
        } else {
          type = 'paragraph';
        }
        break;
      default:
        type = 'paragraph';
        break;
    }
    let html = '';
    if (type === 'code') {
      const codeValue = (node as any).value || '';
      const lang = meta.lang;
      let highlighted = '';
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(codeValue, { language: lang }).value;
        } catch {
          highlighted = escapeHtml(codeValue);
        }
      } else {
        try {
          highlighted = hljs.highlightAuto(codeValue).value;
        } catch {
          highlighted = escapeHtml(codeValue);
        }
      }
      html = `<pre><code class="hljs ${lang ? 'language-' + lang : ''}">${highlighted}</code></pre>`;
    } else {
      try {
        const htmlResult = remark().use(remarkGfm).use(remarkHtml).processSync(raw);
        html = String(htmlResult).trim();
      } catch (err) {
        console.error('Error rendering HTML for block:', err);
        html = `<p>${escapeHtml(raw)}</p>`;
      }
    }
    blocks.push({
      id: generateUUID(),
      type,
      raw,
      html,
      position: {
        start: { line: pos.start.line, column: pos.start.column },
        end: { line: pos.end.line, column: pos.end.column },
      },
      meta: Object.keys(meta).length > 0 ? meta : undefined,
    });
  }
  return blocks;
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(b => b.raw).join('\n\n');
}

export function updateBlockInContent(
  content: string,
  blockId: string,
  newRaw: string,
  position: Block['position']
): string {
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);

  const startIdx = position.start.line - 1;
  const endIdx = position.end.line - 1;

  if (startIdx < 0 || startIdx >= lines.length || endIdx < 0 || endIdx >= lines.length || startIdx > endIdx) {
    return content;
  }

  const newLines = newRaw.split(/\r?\n/);
  lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);

  return lines.join(lineEnding);
}

export function insertBlockInContent(
  content: string,
  index: number,
  blocks: Block[]
): string {
  const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);

  if (blocks.length === 0 || index < 0 || index >= blocks.length) {
    const space = content.length > 0 && !content.endsWith(lineEnding) ? lineEnding + lineEnding : '';
    return content + space + 'New paragraph';
  }

  const block = blocks[index];
  const endLineIdx = block.position.end.line - 1;

  lines.splice(endLineIdx + 1, 0, '', 'New paragraph');

  return lines.join(lineEnding);
}