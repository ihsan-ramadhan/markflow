(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'ready' });
    });
  } else {
    vscode.postMessage({ type: 'ready' });
  }
}());
