import { marked } from 'marked';

(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');
  let currentBlocks = [];
  let editingBlockId = null;
  let pendingFocusIndex = null;

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'init':
        editingBlockId = null;
        renderBlocks(message.blocks);
        break;
      case 'update':
        if (editingBlockId !== null) {
          break;
        }
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
      emptyMsg.addEventListener('click', () => {
        vscode.postMessage({ type: 'addBlock', index: -1 });
      });
      container.appendChild(emptyMsg);
      return;
    }

    blocks.forEach((block, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'block-wrapper';

      // Hover Add Button on the left of each block
      const addBtn = document.createElement('button');
      addBtn.className = 'hover-add-btn';
      addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path fill="currentColor" d="M14 7H9V2H7v5H2v2h5v5h2V9h5V7z"/></svg>`;
      addBtn.title = 'Add block below';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pendingFocusIndex = index + 1;
        vscode.postMessage({
          type: 'addBlock',
          index: index
        });
      });

      const blockEl = document.createElement('div');
      blockEl.className = 'md-block';
      blockEl.dataset.id = block.id;
      blockEl.dataset.type = block.type;
      blockEl.innerHTML = block.html;

      wrapper.appendChild(addBtn);
      wrapper.appendChild(blockEl);
      container.appendChild(wrapper);
    });

    // Elegant bottom "+ Add Block" button
    const bottomAddBtn = document.createElement('div');
    bottomAddBtn.className = 'bottom-add-btn';
    bottomAddBtn.innerHTML = `<span>+ Add Block</span>`;
    bottomAddBtn.addEventListener('click', () => {
      pendingFocusIndex = currentBlocks.length;
      vscode.postMessage({
        type: 'addBlock',
        index: currentBlocks.length - 1
      });
    });
    container.appendChild(bottomAddBtn);

    // Auto-focus new block if set
    if (pendingFocusIndex !== null) {
      const wrappers = container.querySelectorAll('.block-wrapper');
      if (pendingFocusIndex >= 0 && pendingFocusIndex < wrappers.length) {
        const targetWrapper = wrappers[pendingFocusIndex];
        const targetBlock = targetWrapper.querySelector('.md-block');
        const targetBlockData = currentBlocks[pendingFocusIndex];
        if (targetBlock && targetBlockData) {
          switchToEditMode(targetBlock, targetBlockData);
        }
      }
      pendingFocusIndex = null;
    }
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
    editingBlockId = blockData.id;
    blockEl.classList.add('editing');
    
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = blockData.raw;
    
    const lines = blockData.raw.split('\n').length;
    textarea.rows = Math.max(lines, 2);
    
    blockEl.innerHTML = '';
    blockEl.appendChild(textarea);
    textarea.focus();
    
    let undoStack = [textarea.value];
    let redoStack = [];

    textarea.style.height = (textarea.scrollHeight) + 'px';
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
      
      undoStack.push(textarea.value);
      redoStack = [];
    });

    textarea.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey) {
          if (redoStack.length > 0) {
            undoStack.push(textarea.value);
            textarea.value = redoStack.pop();
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
          }
        } else {
          if (undoStack.length > 1) {
            redoStack.push(undoStack.pop());
            textarea.value = undoStack[undoStack.length - 1];
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
          }
        }
      } else if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        e.stopPropagation();
        if (redoStack.length > 0) {
          undoStack.push(textarea.value);
          textarea.value = redoStack.pop();
          textarea.style.height = 'auto';
          textarea.style.height = (textarea.scrollHeight) + 'px';
        }
      }
    });

    textarea.addEventListener('blur', () => {
      saveAndExit(blockEl, blockData, textarea);
    });
  }

  function saveAndExit(blockEl, blockData, textarea) {
    if (!blockEl.classList.contains('editing')) return;
    
    const newRaw = textarea.value;
    blockData.raw = newRaw;
    
    const newHtml = marked.parse(newRaw).trim();
    blockData.html = newHtml;
    
    blockEl.innerHTML = newHtml;
    blockEl.classList.remove('editing');
    editingBlockId = null;
    
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
