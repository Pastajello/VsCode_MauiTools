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
    const csprojUri = await findNearestCsproj(folderUri);

    if (!csprojUri) {
        return 'MyApp';
    }

    const rootNamespace = await getRootNamespaceFromCsproj(csprojUri);
    const projectDir = vscode.Uri.file(csprojUri.path.substring(0, csprojUri.path.lastIndexOf('/')));

    const relative = getRelativeNamespace(projectDir, folderUri);

    return relative
        ? `${rootNamespace}.${relative}`
        : rootNamespace;
}

async function findNearestCsproj(startUri: vscode.Uri): Promise<vscode.Uri | undefined> {
    let current = startUri;

    while (true) {
        const pattern = new vscode.RelativePattern(current, '*.csproj');
        const files = await vscode.workspace.findFiles(pattern, null, 1);

        if (files.length > 0) {
            return files[0];
        }

        const parentPath = current.path.substring(0, current.path.lastIndexOf('/'));
        if (!parentPath || parentPath === current.path) {
            return undefined;
        }

        current = vscode.Uri.file(parentPath);
    }
}

async function getRootNamespaceFromCsproj(csprojUri: vscode.Uri): Promise<string> {
    const contentBytes = await vscode.workspace.fs.readFile(csprojUri);
    const content = new TextDecoder().decode(contentBytes);

    const rootNamespaceMatch = content.match(/<RootNamespace>(.*?)<\/RootNamespace>/);
    if (rootNamespaceMatch) {
        return rootNamespaceMatch[1];
    }

    const assemblyNameMatch = content.match(/<AssemblyName>(.*?)<\/AssemblyName>/);
    if (assemblyNameMatch) {
        return assemblyNameMatch[1];
    }

    const fileName = csprojUri.path.split('/').pop() || 'MyApp';
    return fileName.replace('.csproj', '');
}

function getRelativeNamespace(projectDir: vscode.Uri, folderUri: vscode.Uri): string {
    const projectPath = projectDir.path;
    const folderPath = folderUri.path;

    if (!folderPath.startsWith(projectPath)) {
        return '';
    }

    const relativePath = folderPath.substring(projectPath.length).replace(/^\/+/, '');

    return relativePath
        .split('/')
        .filter(Boolean)
        .map(segment => sanitizeNamespaceSegment(segment))
        .join('.');
}

function sanitizeNamespaceSegment(segment: string): string {
    return segment
        .replace(/[^a-zA-Z0-9_]/g, '')
        .replace(/^[^a-zA-Z_]+/, '');
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

