import * as vscode from 'vscode';
import { markdownToBlocks, updateBlockInContent } from './utils/parser';

class MarkdownDocument implements vscode.CustomDocument {
  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  public readonly onDidDispose = this._onDidDispose.event;

  constructor(
    public readonly uri: vscode.Uri,
    private _documentText: string
  ) {}

  public get text(): string {
    return this._documentText;
  }

  public set text(value: string) {
    this._documentText = value;
  }

  public dispose(): void {
    this._onDidDispose.fire();
    this._onDidDispose.dispose();
  }
}

export class MarkdownEditorProvider implements vscode.CustomEditorProvider<MarkdownDocument> {
  private static readonly viewType = 'markflow.markdownEditor';

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(MarkdownEditorProvider.viewType, provider);
  }

  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<vscode.CustomDocumentEditEvent<MarkdownDocument>>();
  public readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<MarkdownDocument> {
    const fileData = await vscode.workspace.fs.readFile(uri);
    const content = new TextDecoder('utf-8').decode(fileData);
    return new MarkdownDocument(uri, content);
  }

  public async resolveCustomEditor(
    document: MarkdownDocument,
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

    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'ready':
            webviewPanel.webview.postMessage({
              type: 'init',
              blocks: markdownToBlocks(document.text),
            });
            break;
          case 'updateBlock':
            this.updateBlock(document, message.index, message.raw, webviewPanel);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private updateBlock(document: MarkdownDocument, index: number, newRaw: string, webviewPanel: vscode.WebviewPanel) {
    const blocks = markdownToBlocks(document.text);
    if (index < 0 || index >= blocks.length) return;

    const block = blocks[index];
    if (!block.position) return;

    const oldText = document.text;
    const newText = updateBlockInContent(document.text, block.id, newRaw, block.position);
    
    this._onDidChangeCustomDocument.fire({
      document,
      undo: () => {
        document.text = oldText;
        webviewPanel.webview.postMessage({ type: 'update', blocks: markdownToBlocks(document.text) });
      },
      redo: () => {
        document.text = newText;
        webviewPanel.webview.postMessage({ type: 'update', blocks: markdownToBlocks(document.text) });
      }
    });
    
    document.text = newText;
  }

  public async saveCustomDocument(
    document: MarkdownDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const encoded = new TextEncoder().encode(document.text);
    await vscode.workspace.fs.writeFile(document.uri, encoded);
  }

  public async saveCustomDocumentAs(
    document: MarkdownDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const encoded = new TextEncoder().encode(document.text);
    await vscode.workspace.fs.writeFile(destination, encoded);
  }

  public async revertCustomDocument(
    document: MarkdownDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const fileData = await vscode.workspace.fs.readFile(document.uri);
    const content = new TextDecoder('utf-8').decode(fileData);
    document.text = content;
  }

  public async backupCustomDocument(
    document: MarkdownDocument,
    backupContext: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    const encoded = new TextEncoder().encode(document.text);
    await vscode.workspace.fs.writeFile(backupContext.destination, encoded);

    return {
      id: backupContext.destination.toString(),
      delete: async () => {},
    };
  }

}
