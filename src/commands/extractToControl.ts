import * as vscode from 'vscode';
import * as path from 'path';
import { getNamespace } from '../utils/mauiHelper';

import {
    extractXmlns,
    extractBindings,
    generateBindableProperties,
    generateXaml,
    generateCodeBehind
} from '../core/extractLogic';

export async function extractToControl() {

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
        vscode.window.showErrorMessage('Nothing selected');
        return;
    }

    const name = await askForName();
    if (!name) return;

    const folderUri = await pickFolder(editor.document.uri);
    if (!folderUri) return;

    const namespace = await getNamespace(folderUri);
    const fullClass = `${namespace}.${name}`;

    const xamlPath = path.join(folderUri.fsPath, `${name}.xaml`);
    const csPath = path.join(folderUri.fsPath, `${name}.xaml.cs`);

    const docText = editor.document.getText();

    // =========================
    // LOGIC (PURE)
    // =========================

    const { extraXmlns, missingPrefixes } = extractXmlns(selectedText, docText);

    const bindings = extractBindings(selectedText);

    const bindableProperties = generateBindableProperties(bindings, name);

    const xamlContent = generateXaml(fullClass, selectedText, extraXmlns);

    const csContent = generateCodeBehind(namespace, name, bindableProperties);

    // =========================
    // FILES
    // =========================

    await writeFile(xamlPath, xamlContent);
    await writeFile(csPath, csContent);

    // =========================
    // EDIT ORIGINAL
    // =========================

    await replaceWithControl(editor, selection, docText, namespace, name);

    // =========================
    // FEEDBACK
    // =========================

    if (missingPrefixes.length > 0) {
        vscode.window.showWarningMessage(
            `Missing xmlns for: ${missingPrefixes.join(', ')}`
        );
    } else {
        vscode.window.showInformationMessage(`Created ${name}`);
    }
}

//
// =========================
// UI HELPERS
// =========================
//

async function askForName(): Promise<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Name of new ContentView',
        value: 'MyControl'
    });
}

async function pickFolder(docUri: vscode.Uri): Promise<vscode.Uri | undefined> {

    const result = await vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file(path.dirname(docUri.fsPath)),
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false
    });

    return result?.[0];
}

//
// =========================
// REPLACE
// =========================
//

async function replaceWithControl(
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    docText: string,
    namespace: string,
    name: string
) {

    await editor.edit(editBuilder => {

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

        let prefixToUse = foundPrefix;

        if (!prefixToUse) {

            let base = namespace.split('.').pop()?.toLowerCase() || 'controls';

            if (!['views', 'controls', 'components'].includes(base)) {
                base = 'controls';
            }

            prefixToUse = base;

            let i = 1;
            while (usedPrefixes.has(prefixToUse)) {
                prefixToUse = `${base}${i++}`;
            }

            const xmlns = `xmlns:${prefixToUse}="clr-namespace:${namespace}"`;

            const rootMatch = docText.match(/<[^!?][^>]+/);

            if (rootMatch && rootMatch.index !== undefined) {
                const pos = editor.document.positionAt(
                    rootMatch.index + rootMatch[0].length
                );
                editBuilder.insert(pos, ` ${xmlns}`);
            }
        }

        editBuilder.replace(selection, `<${prefixToUse}:${name} />`);
    });
}

//
// =========================
// FILE
// =========================
//

async function writeFile(pathStr: string, content: string) {
    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(pathStr),
        Buffer.from(content, 'utf8')
    );
}
