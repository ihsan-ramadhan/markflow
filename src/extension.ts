import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './MarkdownEditor';

export function activate(context: vscode.ExtensionContext) {
  console.log('MarkFlow extension is now active!');
  context.subscriptions.push(MarkdownEditorProvider.register(context));
}

export function deactivate() {}
