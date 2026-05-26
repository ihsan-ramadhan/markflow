import { marked } from 'marked';

(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');
  let currentBlocks = [];
  let editingBlockId = null;
  let pendingFocusIndex = null;
  let selectedBlockIds = new Set();
  let lastSelectedIndex = -1;
  let shouldSelectLastIndexOnUpdate = false;

  window.addEventListener('message', (event) => {
    const message = event.data;
    console.log('Webview received message:', message.type, 'editingBlockId:', editingBlockId);
    switch (message.type) {
      case 'init':
        editingBlockId = null;
        selectedBlockIds.clear();
        lastSelectedIndex = -1;
        shouldSelectLastIndexOnUpdate = false;
        renderBlocks(message.blocks);
        break;
      case 'update':
        if (editingBlockId !== null) {
          console.log('Ignoring update render because editingBlockId is not null:', editingBlockId);
          break;
        }
        console.log('Rendering blocks on update message');

        const selectedIndices = [];
        if (!shouldSelectLastIndexOnUpdate) {
          currentBlocks.forEach((block, index) => {
            if (selectedBlockIds.has(block.id)) {
              selectedIndices.push(index);
            }
          });
        }

        renderBlocks(message.blocks);

        if (shouldSelectLastIndexOnUpdate) {
          selectedBlockIds.clear();
          if (lastSelectedIndex !== -1 && lastSelectedIndex < currentBlocks.length) {
            selectedBlockIds.add(currentBlocks[lastSelectedIndex].id);
          }
          updateSelectionStyles();
          shouldSelectLastIndexOnUpdate = false;
        } else {
          selectedBlockIds.clear();
          selectedIndices.forEach(idx => {
            if (idx >= 0 && idx < currentBlocks.length) {
              selectedBlockIds.add(currentBlocks[idx].id);
            }
          });
          updateSelectionStyles();
        }
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
      if (selectedBlockIds.has(block.id)) {
        wrapper.classList.add('selected');
      }

      const actionGroup = document.createElement('div');
      actionGroup.className = 'block-actions';

      const addBtn = document.createElement('button');
      addBtn.className = 'action-btn hover-add-btn';
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

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn hover-delete-btn';
      deleteBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path fill="currentColor" d="M11 2H9c0-.55-.45-1-1-1s-1 .45-1 1H5c-.55 0-1 .45-1 1v1h8V3c0-.55-.45-1-1-1zm1 3H4v9c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V5zm-2 8H6v-1h4v1zm0-2H6v-1h4v1zm0-2H6V7h4v1z"/></svg>`;
      deleteBtn.title = 'Delete block';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vscode.postMessage({
          type: 'deleteBlock',
          index: index
        });
      });

      actionGroup.appendChild(addBtn);
      actionGroup.appendChild(deleteBtn);

      const blockEl = document.createElement('div');
      blockEl.className = 'md-block';
      blockEl.dataset.id = block.id;
      blockEl.dataset.type = block.type;
      
      if (!block.raw || block.raw.trim() === '') {
        blockEl.innerHTML = `<p class="placeholder-text">Tulis sesuatu...</p>`;
      } else {
        blockEl.innerHTML = block.html;
      }

      blockEl.addEventListener('mousedown', (e) => {
        if (editingBlockId !== null) return;
        
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
        const shiftKey = e.shiftKey;

        // Prevent native blue text selection when Ctrl/Shift selecting blocks
        if (ctrlKey || shiftKey) {
          e.preventDefault();
          window.getSelection().removeAllRanges();
        }
        e.stopPropagation();

        if (ctrlKey) {
          if (selectedBlockIds.has(block.id)) {
            selectedBlockIds.delete(block.id);
          } else {
            selectedBlockIds.add(block.id);
            lastSelectedIndex = index;
          }
        } else if (shiftKey && lastSelectedIndex !== -1) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          selectedBlockIds.clear();
          for (let i = start; i <= end; i++) {
            selectedBlockIds.add(currentBlocks[i].id);
          }
        } else {
          selectedBlockIds.clear();
          selectedBlockIds.add(block.id);
          lastSelectedIndex = index;
        }

        updateSelectionStyles();
      });

      wrapper.appendChild(actionGroup);
      wrapper.appendChild(blockEl);
      container.appendChild(wrapper);
    });

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
    selectedBlockIds.clear();
    updateSelectionStyles();

    editingBlockId = blockData.id;
    lastSelectedIndex = currentBlocks.findIndex(b => b.id === blockData.id);
    shouldSelectLastIndexOnUpdate = false;
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
        shouldSelectLastIndexOnUpdate = true;
        textarea.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === blockData.id);
        console.log('Tab pressed, currentIndex:', currentIndex, 'blockData.id:', blockData.id);
        
        isSaving = true;
        const newRaw = textarea.value.replace(/\r?\n+$/, '');
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
      } else if (e.key === 'Enter' && !e.shiftKey && !cmdKey) {
        e.preventDefault();
        console.log('Enter pressed, blurring textarea');
        shouldSelectLastIndexOnUpdate = true;
        textarea.blur();
      } else if (cmdKey && e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === blockData.id);
        console.log('Ctrl+Enter pressed, currentIndex:', currentIndex);
        
        isSaving = true;
        const newRaw = textarea.value.replace(/\r?\n+$/, '');
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
      } else if (e.key === 'Backspace' && textarea.value === '') {
        e.preventDefault();
        const currentIndex = currentBlocks.findIndex(b => b.id === blockData.id);
        console.log('Backspace pressed on empty block, currentIndex:', currentIndex);

        isSaving = true;
        blockEl.classList.remove('editing');
        editingBlockId = null;

        vscode.postMessage({
          type: 'deleteBlock',
          index: currentIndex
        });

        setTimeout(() => {
          const wrappers = container.querySelectorAll('.block-wrapper');
          if (currentIndex > 0 && currentIndex - 1 < wrappers.length) {
            const prevWrapper = wrappers[currentIndex - 1];
            const prevBlock = prevWrapper.querySelector('.md-block');
            const prevBlockData = currentBlocks[currentIndex - 1];
            if (prevBlock && prevBlockData) {
              switchToEditMode(prevBlock, prevBlockData);
            }
          }
        }, 10);
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
    
    const newRaw = textarea.value.replace(/\r?\n+$/, '');
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

  function updateSelectionStyles() {
    const wrappers = container.querySelectorAll('.block-wrapper');
    wrappers.forEach((wrapper, index) => {
      const block = currentBlocks[index];
      if (block && selectedBlockIds.has(block.id)) {
        wrapper.classList.add('selected');
      } else {
        wrapper.classList.remove('selected');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (editingBlockId !== null) return;
    if (!e.target.closest('.block-wrapper')) {
      selectedBlockIds.clear();
      lastSelectedIndex = -1;
      updateSelectionStyles();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (editingBlockId !== null) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectedBlockIds.clear();
      currentBlocks.forEach(b => selectedBlockIds.add(b.id));
      lastSelectedIndex = 0;
      updateSelectionStyles();
    }
    else if (e.key === 'Escape') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        selectedBlockIds.clear();
        lastSelectedIndex = -1;
        updateSelectionStyles();
      }
    }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        const indicesToDelete = [];
        currentBlocks.forEach((block, index) => {
          if (selectedBlockIds.has(block.id)) {
            indicesToDelete.push(index);
          }
        });
        
        selectedBlockIds.clear();
        lastSelectedIndex = -1;
        updateSelectionStyles();

        vscode.postMessage({
          type: 'deleteBlocks',
          indices: indicesToDelete
        });
      }
    }
    else if (ctrlKey && e.key.toLowerCase() === 'c') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        const copyText = currentBlocks
          .filter(block => selectedBlockIds.has(block.id))
          .map(block => block.raw)
          .join('\n\n');

        navigator.clipboard.writeText(copyText).then(() => {
          console.log('Copied blocks to clipboard successfully');
        }).catch(err => {
          console.error('Failed to copy blocks to clipboard:', err);
        });
      }
    }
    else if (ctrlKey && e.key.toLowerCase() === 'x') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        const copyText = currentBlocks
          .filter(block => selectedBlockIds.has(block.id))
          .map(block => block.raw)
          .join('\n\n');

        navigator.clipboard.writeText(copyText).then(() => {
          console.log('Cut blocks copied to clipboard successfully');
          const indicesToDelete = [];
          currentBlocks.forEach((block, index) => {
            if (selectedBlockIds.has(block.id)) {
              indicesToDelete.push(index);
            }
          });
          
          selectedBlockIds.clear();
          lastSelectedIndex = -1;
          updateSelectionStyles();

          vscode.postMessage({
            type: 'deleteBlocks',
            indices: indicesToDelete
          });
        }).catch(err => {
          console.error('Failed to cut blocks:', err);
        });
      }
    }
    else if (e.key === 'ArrowDown') {
      if (currentBlocks.length === 0) return;
      e.preventDefault();
      let nextIndex = 0;
      if (selectedBlockIds.size > 0 && lastSelectedIndex !== -1) {
        nextIndex = lastSelectedIndex + 1;
        if (nextIndex >= currentBlocks.length) {
          nextIndex = currentBlocks.length - 1;
        }
      }
      selectedBlockIds.clear();
      selectedBlockIds.add(currentBlocks[nextIndex].id);
      lastSelectedIndex = nextIndex;
      updateSelectionStyles();
      const wrappers = container.querySelectorAll('.block-wrapper');
      if (wrappers[nextIndex]) {
        wrappers[nextIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    else if (e.key === 'ArrowUp') {
      if (currentBlocks.length === 0) return;
      e.preventDefault();
      let prevIndex = currentBlocks.length - 1;
      if (selectedBlockIds.size > 0 && lastSelectedIndex !== -1) {
        prevIndex = lastSelectedIndex - 1;
        if (prevIndex < 0) {
          prevIndex = 0;
        }
      }
      selectedBlockIds.clear();
      selectedBlockIds.add(currentBlocks[prevIndex].id);
      lastSelectedIndex = prevIndex;
      updateSelectionStyles();
      const wrappers = container.querySelectorAll('.block-wrapper');
      if (wrappers[prevIndex]) {
        wrappers[prevIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    else if (e.key === 'Enter') {
      if (selectedBlockIds.size === 1 && lastSelectedIndex !== -1) {
        e.preventDefault();
        const wrappers = container.querySelectorAll('.block-wrapper');
        const targetWrapper = wrappers[lastSelectedIndex];
        if (targetWrapper) {
          const targetBlock = targetWrapper.querySelector('.md-block');
          const targetBlockData = currentBlocks[lastSelectedIndex];
          if (targetBlock && targetBlockData) {
            switchToEditMode(targetBlock, targetBlockData);
          }
        }
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'ready' });
    });
  } else {
    vscode.postMessage({ type: 'ready' });
  }
}());
