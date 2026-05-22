import { marked } from 'marked';

(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');
  let currentBlocks = [];

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'init':
      case 'update':
        renderBlocks(message.blocks);
        break;
    }
  });

  function renderBlocks(blocks) {
    if (!container) return;
    container.innerHTML = '';
    currentBlocks = blocks || [];

    if (!blocks || blocks.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-editor';
      emptyMsg.textContent = 'Double-click to start writing markdown...';
      container.appendChild(emptyMsg);
      return;
    }

    blocks.forEach((block) => {
      const blockEl = document.createElement('div');
      blockEl.className = 'md-block';
      blockEl.dataset.id = block.id;
      blockEl.dataset.type = block.type;
      
      blockEl.innerHTML = block.html;
      container.appendChild(blockEl);
    });
  }

  container.addEventListener('dblclick', (e) => {
    const blockEl = e.target.closest('.md-block');
    if (!blockEl) return;
    
    if (blockEl.classList.contains('editing')) return;
    
    const blockId = blockEl.dataset.id;
    const blockData = currentBlocks.find(b => b.id === blockId);
    if (!blockData) return;
    
    switchToEditMode(blockEl, blockData);
  });

  function switchToEditMode(blockEl, blockData) {
    blockEl.classList.add('editing');
    
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = blockData.raw;
    
    const lines = blockData.raw.split('\n').length;
    textarea.rows = Math.max(lines, 2);
    
    blockEl.innerHTML = '';
    blockEl.appendChild(textarea);
    textarea.focus();
    
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
    });

    textarea.addEventListener('blur', () => {
      saveAndExit(blockEl, blockData, textarea);
    });
  }

  function saveAndExit(blockEl, blockData, textarea) {
    const newRaw = textarea.value;
    blockData.raw = newRaw;
    
    const newHtml = marked.parse(newRaw).trim();
    blockData.html = newHtml;
    
    blockEl.innerHTML = newHtml;
    blockEl.classList.remove('editing');
    
    const blockIndex = currentBlocks.findIndex(b => b.id === blockData.id);
    
    vscode.postMessage({
      type: 'updateBlock',
      id: blockData.id,
      index: blockIndex,
      raw: newRaw
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'ready' });
    });
  } else {
    vscode.postMessage({ type: 'ready' });
  }
}());
