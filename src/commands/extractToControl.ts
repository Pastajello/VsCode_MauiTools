import * as vscode from 'vscode';
import * as path from 'path';
import { getNamespace } from '../utils/mauiHelper';

export async function extractToControl() {

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

    // =========================
    //  EXTRACT USED XMLNS
    // =========================

    const usedPrefixes = new Set<string>();
    const prefixRegex = /\b([a-zA-Z_][\w]*):/g;

    let match;
    while ((match = prefixRegex.exec(selectedText)) !== null) {
        const prefix = match[1];

        if (prefix === 'x') continue;

        usedPrefixes.add(prefix);
    }

    const docText = editor.document.getText();

    const xmlnsRegex = /xmlns:(\w+)="([^"]+)"/g;
    const namespaceMap = new Map<string, string>();

    while ((match = xmlnsRegex.exec(docText)) !== null) {
        namespaceMap.set(match[1], match[2]);
    }

    let extraXmlns = '';
    const missingPrefixes: string[] = [];

    for (const prefix of usedPrefixes) {
        const ns = namespaceMap.get(prefix);

        if (ns) {
            extraXmlns += `\n             xmlns:${prefix}="${ns}"`;
        } else {
            missingPrefixes.push(prefix);
        }
    }

    // =========================
    //  CREATE XAML
    // =========================

    const wrapped = `
<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"${extraXmlns}
             x:Class="${fullClass}">
${selectedText}
</ContentView>
`.trim();

    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(xamlPath),
        Buffer.from(wrapped, 'utf8')
    );

    // =========================
    //  CREATE CODE BEHIND
    // =========================

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

    // =========================
    //  EDIT ORIGINAL FILE
    // =========================

    await editor.edit(editBuilder => {

        const namespaceRegex = /xmlns:(\w+)="clr-namespace:([^"]+)"/g;

        let match;
        let foundPrefix: string | null = null;
        const usedPrefixesInDoc = new Set<string>();

        while ((match = namespaceRegex.exec(docText)) !== null) {
            const prefix = match[1];
            const ns = match[2];

            usedPrefixesInDoc.add(prefix);

            if (ns === namespace) {
                foundPrefix = prefix;
            }
        }

        // --- decide prefix ---
        let prefixToUse = foundPrefix;

        if (!prefixToUse) {

            const lastPart = namespace.split('.').pop()?.toLowerCase() || 'controls';

            let base = lastPart;

            if (!['views', 'controls', 'components'].includes(base)) {
                base = 'controls';
            }

            prefixToUse = base;

            let counter = 1;
            while (usedPrefixesInDoc.has(prefixToUse)) {
                prefixToUse = `${base}${counter}`;
                counter++;
            }

            const xmlns = `xmlns:${prefixToUse}="clr-namespace:${namespace}"`;

            const rootMatch = docText.match(/<[^!?][^>]+/);

            if (rootMatch && rootMatch.index !== undefined) {

                const insertPos = editor.document.positionAt(
                    rootMatch.index + rootMatch[0].length
                );

                editBuilder.insert(insertPos, ` ${xmlns}`);
            }
        }

        // --- replace selection ---
        editBuilder.replace(selection, `<${prefixToUse}:${name} />`);
    });

    // =========================
    //  FEEDBACK
    // =========================

    if (missingPrefixes.length > 0) {
        vscode.window.showWarningMessage(
            `Missing xmlns for: ${missingPrefixes.join(', ')}`
        );
    } else {
        vscode.window.showInformationMessage(`Created ${name}`);
    }
}
