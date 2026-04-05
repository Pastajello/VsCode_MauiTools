import * as vscode from 'vscode';
import * as path from 'path';
import { getNamespace } from '../utils/mauiHelper';

export async function extractToContentView() {

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showErrorMessage('Nothing selected');
        return;
    }

    // --- NAME ---
    const name = await vscode.window.showInputBox({
        prompt: 'Name of new ContentView',
        value: 'MyControl'
    });

    if (!name) return;

    const docUri = editor.document.uri;

    // --- PICK TARGET FOLDER ---
    const folderPick = await vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file(path.dirname(docUri.fsPath)),
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select target folder for ContentView'
    });

    if (!folderPick || folderPick.length === 0) return;

    const folderUri = folderPick[0];
    const folderPath = folderUri.fsPath;

    // --- NAMESPACE ---
    const namespace = await getNamespace(folderUri);
    const fullClass = `${namespace}.${name}`;

    const xamlPath = path.join(folderPath, `${name}.xaml`);
    const csPath = path.join(folderPath, `${name}.xaml.cs`);

    // --- CREATE XAML ---
    const wrapped = `
<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             x:Class="${fullClass}">
${selectedText}
</ContentView>
`.trim();

    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(xamlPath),
        Buffer.from(wrapped, 'utf8')
    );

    // --- CREATE CS ---
    const cs = `
namespace ${namespace};

public partial class ${name} : ContentView
{
    public ${name}()
    {
        InitializeComponent();
    }
}
`.trim();

    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(csPath),
        Buffer.from(cs, 'utf8')
    );

    // --- EDIT ORIGINAL FILE ---
    await editor.edit(editBuilder => {

        // 1. Replace selection
        editBuilder.replace(selection, `<local:${name} />`);

        const docText = editor.document.getText();

        // 2. Ensure xmlns:local exists
        if (!docText.includes('xmlns:local=')) {

            const xmlns = `xmlns:local="clr-namespace:${namespace}"`;

            // find root tag
            const match = docText.match(/<[^!?][^>]+/);

            if (match && match.index !== undefined) {

                const insertPos = editor.document.positionAt(
                    match.index + match[0].length
                );

                editBuilder.insert(insertPos, ` ${xmlns}`);
            }
        }
    });

    vscode.window.showInformationMessage(`Created ${name}`);
}
