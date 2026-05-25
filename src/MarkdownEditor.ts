import * as vscode from 'vscode';
import { markdownToBlocks, updateBlockInContent } from './utils/parser';

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'markflow.markdownEditor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(MarkdownEditorProvider.viewType, provider);
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };

    const templateUri = vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'index.html');
    const templateData = await vscode.workspace.fs.readFile(templateUri);
    const templateHtml = new TextDecoder('utf-8').decode(templateData);

    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'editor.js')
    );
    const styleUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'style.css')
    );

    webviewPanel.webview.html = templateHtml
      .replace('${scriptUri}', scriptUri.toString())
      .replace('${styleUri}', styleUri.toString());

    // Listen to messages from the webview
    const messageSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'ready':
            webviewPanel.webview.postMessage({
              type: 'init',
              blocks: markdownToBlocks(document.getText()),
            });
            break;
          case 'updateBlock':
            this.updateBlock(document, message.index, message.raw);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          type: 'update',
          blocks: markdownToBlocks(document.getText())
        });
      }
    });

    // Clean up subscriptions when the webview is closed
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      messageSubscription.dispose();
    });
  }

  private updateBlock(document: vscode.TextDocument, index: number, newRaw: string) {
    const blocks = markdownToBlocks(document.getText());
    if (index < 0 || index >= blocks.length) return;

    const block = blocks[index];
    if (!block.position) return;

    const newText = updateBlockInContent(document.getText(), block.id, newRaw, block.position);
    
    // Create a WorkspaceEdit to replace the entire document content
    const edit = new vscode.WorkspaceEdit();
    const lastLine = document.lineAt(document.lineCount - 1);
    const fullRange = new vscode.Range(0, 0, lastLine.lineNumber, lastLine.range.end.character);
    
    edit.replace(document.uri, fullRange, newText);
    vscode.workspace.applyEdit(edit);
  }
}
