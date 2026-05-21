(function () {
  const vscode = acquireVsCodeApi();
  const container = document.getElementById('editor-container');

  // Listen for messages from the extension host
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'init':
      case 'update':
        renderBlocks(message.blocks);
        break;
    }
  });

  // Render markdown blocks into the container
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
      
      // Inject pre-rendered HTML from the parser
      blockEl.innerHTML = block.html;
      container.appendChild(blockEl);
    });
  }

  // Signal to the extension host that the webview is ready to receive data
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'ready' });
    });
  } else {
    vscode.postMessage({ type: 'ready' });
  }
}());
