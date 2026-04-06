// PURE LOGIC — ZERO vscode

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

export function extractBindings(text: string): string[] {

     const matches = [...text.matchAll(/\{Binding\s+([A-Za-z0-9_.]+)/g)];

    const props = matches.map(m => {
        const full = m[1];

        // weź ostatni segment po kropce
        const parts = full.split('.');
        return parts[parts.length - 1];
    });

    return [...new Set(props)];
}

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

export function generateXaml(fullClass: string, content: string, extraXmlns: string): string {

    return `
<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"${extraXmlns}
             x:Class="${fullClass}">
${content}
</ContentView>
`.trim();
}

export function generateCodeBehind(namespace: string, name: string, props: string): string {

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
