import { marked } from 'marked';

(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');
  let currentBlocks = [];
  let editingBlockId = null;
  let pendingFocusIndex = null;

  window.addEventListener('message', (event) => {
    const message = event.data;
    console.log('Webview received message:', message.type, 'editingBlockId:', editingBlockId);
    switch (message.type) {
      case 'init':
        editingBlockId = null;
        renderBlocks(message.blocks);
        break;
      case 'update':
        if (editingBlockId !== null) {
          console.log('Ignoring update render because editingBlockId is not null:', editingBlockId);
          break;
        }
        console.log('Rendering blocks on update message');
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
    let isSaving = false;
    
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
      } else if (e.key === 'Escape') {
        console.log('Escape pressed, blurring textarea');
        e.preventDefault();
        textarea.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === blockData.id);
        console.log('Tab pressed, currentIndex:', currentIndex, 'blockData.id:', blockData.id);
        
        isSaving = true;
        const newRaw = textarea.value;
        blockData.raw = newRaw;
        const newHtml = marked.parse(newRaw).trim();
        blockData.html = newHtml;
        blockEl.innerHTML = newHtml;
        blockEl.classList.remove('editing');
        editingBlockId = null;

        vscode.postMessage({
          type: 'updateBlock',
          id: blockData.id,
          index: currentIndex,
          raw: newRaw
        });
        
        setTimeout(() => {
          const wrappers = container.querySelectorAll('.block-wrapper');
          console.log('Timeout fired, wrappers length:', wrappers.length);
          if (e.shiftKey) {
            console.log('Shift+Tab: finding previous block');
            if (currentIndex > 0) {
              const prevWrapper = wrappers[currentIndex - 1];
              const prevBlock = prevWrapper.querySelector('.md-block');
              const prevBlockData = currentBlocks[currentIndex - 1];
              console.log('Found previous block element:', !!prevBlock, 'prevBlockData:', !!prevBlockData);
              if (prevBlock && prevBlockData) {
                switchToEditMode(prevBlock, prevBlockData);
              }
            }
          } else {
            console.log('Tab: finding next block');
            if (currentIndex < currentBlocks.length - 1) {
              const nextWrapper = wrappers[currentIndex + 1];
              const nextBlock = nextWrapper.querySelector('.md-block');
              const nextBlockData = currentBlocks[currentIndex + 1];
              console.log('Found next block element:', !!nextBlock, 'nextBlockData:', !!nextBlockData);
              if (nextBlock && nextBlockData) {
                switchToEditMode(nextBlock, nextBlockData);
              }
            }
          }
        }, 10);
      } else if (cmdKey && e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === blockData.id);
        console.log('Ctrl+Enter pressed, currentIndex:', currentIndex);
        
        isSaving = true;
        const newRaw = textarea.value;
        blockData.raw = newRaw;
        const newHtml = marked.parse(newRaw).trim();
        blockData.html = newHtml;
        blockEl.innerHTML = newHtml;
        blockEl.classList.remove('editing');
        editingBlockId = null;

        pendingFocusIndex = currentIndex + 1;
        console.log('Set pendingFocusIndex:', pendingFocusIndex);
        vscode.postMessage({
          type: 'saveAndAddBlock',
          index: currentIndex,
          raw: newRaw
        });
      }
    });

    textarea.addEventListener('blur', () => {
      console.log('Textarea blur triggered for block ID:', blockData.id, 'isSaving:', isSaving);
      if (isSaving) return;
      saveAndExit(blockEl, blockData, textarea);
    });
  }

  function saveAndExit(blockEl, blockData, textarea) {
    console.log('saveAndExit called, blockEl has editing:', blockEl.classList.contains('editing'));
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
