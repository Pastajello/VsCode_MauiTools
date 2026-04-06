import * as vscode from 'vscode';
import { addContentPage } from './commands/addContentPage';
import { addContentView } from './commands/addContentView';
import { extractToControl } from './commands/extractToControl';

import { ExtractToContentViewProvider } from './codeActions/extractProvider';

export async function activate(context: vscode.ExtensionContext) {
    const isMaui = await detectMauiProject();

    console.log('MAUI DETECTED:', isMaui);

    await vscode.commands.executeCommand('setContext', 'isMauiProject', isMaui);

    context.subscriptions.push(
        vscode.commands.registerCommand('mauiTools.addContentPage', addContentPage),
        vscode.commands.registerCommand('mauiTools.addContentView', addContentView),
        vscode.commands.registerCommand('mauiTools.extractToControl', extractToControl),
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'xaml' },
            new ExtractToContentViewProvider(),
            {
                providedCodeActionKinds: [vscode.CodeActionKind.Refactor]
            }
        )
    );
}

export function deactivate() { }


async function detectMauiProject(): Promise<boolean> {

    const files = await vscode.workspace.findFiles('**/*.csproj');

    for (const file of files) {

        const contentBytes = await vscode.workspace.fs.readFile(file);
        const content = new TextDecoder().decode(contentBytes);

        // I guess this is the most reliable way to detect MAUI projects
        if (content.includes('Microsoft.Maui.Controls')) {
            return true;
        }
    }

    return false;
}
