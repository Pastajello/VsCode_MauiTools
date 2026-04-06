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
    // ETAPY
    // =========================

    const { extraXmlns, missingPrefixes } = extractXmlns(selectedText, docText);

    const bindings = extractBindings(selectedText);

    const bindableProperties = generateBindableProperties(bindings, name);

    const xamlContent = generateXaml(fullClass, selectedText, extraXmlns);

    const csContent = generateCodeBehind(namespace, name, bindableProperties);

    // =========================
    // CREATE FILES
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
// ETAP 1: NAME
// =========================
//

async function askForName(): Promise<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Name of new ContentView',
        value: 'MyControl'
    });
}

//
// =========================
// ETAP 2: FOLDER
// =========================
//

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
// ETAP 3: XMLNS
// =========================
//

export function extractXmlns(selectedText: string, docText: string) {

    const usedPrefixes = new Set<string>();
    const prefixRegex = /\b([a-zA-Z_][\w]*):/g;

    let match;
    while ((match = prefixRegex.exec(selectedText)) !== null) {
        const prefix = match[1];
        if (prefix !== 'x') usedPrefixes.add(prefix);
    }

    const namespaceMap = new Map<string, string>();
    const xmlnsRegex = /xmlns:(\w+)="([^"]+)"/g;

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

    return { extraXmlns, missingPrefixes };
}

//
// =========================
// ETAP 4: BINDINGS
// =========================
//

export function extractBindings(text: string): string[] {

    const matches = [...text.matchAll(/\{Binding\s+([A-Za-z0-9_]+)/g)];

    const props = matches.map(m => m[1]);

    return [...new Set(props)]; // unique
}

//
// =========================
// ETAP 5: BINDABLE PROPERTIES
// =========================
//

export function generateBindableProperties(bindings: string[], controlName: string): string {

    if (bindings.length === 0) return '';

    return bindings.map(name => {

        return `
public static readonly BindableProperty ${name}Property =
    BindableProperty.Create(
        nameof(${name}),
        typeof(object),
        typeof(${controlName})
    );

public object ${name}
{
    get => GetValue(${name}Property);
    set => SetValue(${name}Property, value);
}
`.trim();

    }).join('\n\n');
}

//
// =========================
// ETAP 6: XAML
// =========================
//

export function generateXaml(fullClass: string, content: string, extraXmlns: string): string {

    return `
<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"${extraXmlns}
             x:Class="${fullClass}">
${content}
</ContentView>
`.trim();
}

//
// =========================
// ETAP 7: CODE BEHIND
// =========================
//

function generateCodeBehind(namespace: string, name: string, props: string): string {

    return `
namespace ${namespace};

public partial class ${name} : ContentView
{
    public ${name}()
    {
        InitializeComponent();
    }

${props}
}
`.trim();
}

//
// =========================
// ETAP 8: REPLACE
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
// UTIL
// =========================
//

async function writeFile(pathStr: string, content: string) {
    await vscode.workspace.fs.writeFile(
        vscode.Uri.file(pathStr),
        Buffer.from(content, 'utf8')
    );
}
