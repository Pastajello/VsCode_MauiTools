import * as vscode from 'vscode';

export class ExtractToContentViewProvider implements vscode.CodeActionProvider {

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection
    ): vscode.ProviderResult<vscode.CodeAction[]> {

        // 1. tylko XAML
        if (document.languageId !== 'xaml') return;

        // 2. musi być zaznaczenie
        if (range.isEmpty) return;

        const selectedText = document.getText(range);

        // 3. musi wyglądać jak XAML (najprostszy heurystyczny check)
        if (!selectedText.includes('<') || !selectedText.includes('>')) return;

        const action = new vscode.CodeAction(
            'Extract to ContentView',
            vscode.CodeActionKind.Refactor
        );

        action.command = {
            command: 'mauiTools.extractToContentView',
            title: 'Extract to ContentView'
        };

        return [action];
    }
}
