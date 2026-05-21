import * as vscode from 'vscode';

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

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'ready':
            console.log('Webview is ready');
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
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

  private getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MarkFlow Editor</title>
</head>
<body>
  <div id="editor-container"></div>
</body>
</html>`;
  }
}
