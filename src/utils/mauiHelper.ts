import * as vscode from 'vscode';

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

export async function getNamespace(folderUri: vscode.Uri): Promise<string> {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(folderUri);
    if (!workspaceFolder) return 'MyApp';

    const rootNamespace = await getRootNamespace(workspaceFolder);
    const relative = getRelativeNamespace(workspaceFolder.uri, folderUri);

    return relative
        ? `${rootNamespace}.${relative}`
        : rootNamespace;
}

async function getRootNamespace(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
    const csprojFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, '**/*.csproj'),
        '**/bin/**'
    );

    if (csprojFiles.length === 0) {
        return workspaceFolder.name;
    }

    const csproj = csprojFiles[0];

    const contentBytes = await vscode.workspace.fs.readFile(csproj);
    const content = new TextDecoder().decode(contentBytes);

    const rootNamespaceMatch = content.match(/<RootNamespace>(.*?)<\/RootNamespace>/);
    if (rootNamespaceMatch) {
        return rootNamespaceMatch[1];
    }

    const assemblyNameMatch = content.match(/<AssemblyName>(.*?)<\/AssemblyName>/);
    if (assemblyNameMatch) {
        return assemblyNameMatch[1];
    }

    const fileName = csproj.path.split('/').pop() || 'MyApp';
    return fileName.replace('.csproj', '');
}

function getRelativeNamespace(root: vscode.Uri, folder: vscode.Uri): string {
    let relative = folder.path.replace(root.path, '');

    return relative
        .split('/')
        .filter(p => p.length > 0)
        .join('.');
}
