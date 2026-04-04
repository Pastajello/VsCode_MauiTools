import * as vscode from 'vscode';
import { fileExists, getNamespace } from '../utils/mauiHelper';

export async function addContentView(uri: vscode.Uri) {
    if (!uri) return;

    const viewName = await vscode.window.showInputBox({
        prompt: 'Enter view name',
        placeHolder: 'e.g. MyView',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Name cannot be empty';
            }
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
                return 'Invalid C# class name';
            }
            return null;
        }
    });

    if (!viewName) return;

    const xamlFile = vscode.Uri.joinPath(uri, `${viewName}.xaml`);
    const csFile = vscode.Uri.joinPath(uri, `${viewName}.xaml.cs`);

    const namespace = await getNamespace(uri);

    const xamlContent = `<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
             x:Class="${namespace}.${viewName}">

</ContentView>`;

    const csContent = `using Microsoft.Maui.Controls;

namespace ${namespace};

public partial class ${viewName} : ContentView
{
    public ${viewName}()
    {
        InitializeComponent();
    }
}
`;

    if (await fileExists(xamlFile) || await fileExists(csFile)) {
        vscode.window.showErrorMessage('File already exists');
        return;
    }

    await vscode.workspace.fs.writeFile(xamlFile, new TextEncoder().encode(xamlContent));
    await vscode.workspace.fs.writeFile(csFile, new TextEncoder().encode(csContent));

    const doc = await vscode.workspace.openTextDocument(xamlFile);
    await vscode.window.showTextDocument(doc);

    vscode.window.showInformationMessage(`Created ${viewName}`);
}
