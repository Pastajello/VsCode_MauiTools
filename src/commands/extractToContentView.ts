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

        const docText = editor.document.getText();

        // --- 1. find existing xmlns ---
        const namespaceRegex = /xmlns:(\w+)="clr-namespace:([^"]+)"/g;

        let match;
        let foundPrefix: string | null = null;
        const usedPrefixes = new Set<string>();

        while ((match = namespaceRegex.exec(docText)) !== null) {
            const prefix = match[1];
            const ns = match[2];

            usedPrefixes.add(prefix);

            if (ns === namespace) {
                foundPrefix = prefix;
            }
        }

        // --- 2. decide prefix ---
        let prefixToUse = foundPrefix;

        if (!prefixToUse) {

            // smart prefix from last namespace segment
            const lastPart = namespace.split('.').pop()?.toLowerCase() || 'controls';

            let base = lastPart;

            // normalize common names
            if (base === 'views') base = 'views';
            else if (base === 'controls') base = 'controls';
            else if (base === 'components') base = 'components';
            else base = 'controls';

            prefixToUse = base;

            // ensure uniqueness
            let counter = 1;
            while (usedPrefixes.has(prefixToUse)) {
                prefixToUse = `${base}${counter}`;
                counter++;
            }

            // add xmlns
            const xmlns = `xmlns:${prefixToUse}="clr-namespace:${namespace}"`;

            const rootMatch = docText.match(/<[^!?][^>]+/);

            if (rootMatch && rootMatch.index !== undefined) {

                const insertPos = editor.document.positionAt(
                    rootMatch.index + rootMatch[0].length
                );

                editBuilder.insert(insertPos, ` ${xmlns}`);
            }
        }

        // --- 3. replace selection ---
        editBuilder.replace(selection, `<${prefixToUse}:${name} />`);
    });

    vscode.window.showInformationMessage(`Created ${name}`);
}
