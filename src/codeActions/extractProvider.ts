import * as vscode from 'vscode';

export class ExtractToContentViewProvider implements vscode.CodeActionProvider {
    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection
    ): vscode.ProviderResult<vscode.CodeAction[]> {

        if (document.languageId !== 'xaml') return;

        if (range.isEmpty) return;

        const selectedText = document.getText(range);

        if (!selectedText.includes('<') || !selectedText.includes('>')) return;

        const action = new vscode.CodeAction(
            'Extract to Control',
            vscode.CodeActionKind.Refactor
        );

        action.command = {
            command: 'mauiTools.extractToControl',
            title: 'Extract to Control'
        };

        return [action];
    }
}
