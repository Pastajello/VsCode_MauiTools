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

    const props: string[] = [];

    const bindings = extractBindingBlocks(text);

    for (const contentRaw of bindings) {

        let content = contentRaw.trim();
        if (!content) continue;

        // =========================
        // SAFE SPLIT (ignore commas inside {})
        // =========================

        const parts: string[] = [];
        let current = '';
        let depth = 0;

        for (const char of content) {

            if (char === '{') depth++;
            if (char === '}') depth--;

            if (char === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        if (current) parts.push(current.trim());

        // =========================
        // FIND PATH
        // =========================

        let pathCandidate: string | undefined;

        for (const part of parts) {

            if (part.startsWith('Path=')) {
                pathCandidate = part.replace('Path=', '').trim();
                break;
            }

            if (part.startsWith('Source=')) continue;

            if (!part.includes('=')) {
                pathCandidate = part;
                break;
            }
        }

        if (!pathCandidate) continue;

        // =========================
        // CLEAN PATH
        // =========================

        pathCandidate = pathCandidate
            .replace(/\[.*?\]/g, '')
            .replace(/\?\./g, '.')
            .trim();

        if (pathCandidate === '.' || pathCandidate === '') continue;

        // =========================
        // LAST SEGMENT
        // =========================

        const segments = pathCandidate.split('.');
        const last = segments[segments.length - 1];

        if (!last) continue;

        props.push(last);
    }

    return [...new Set(props)];
}

function extractBindingBlocks(text: string): string[] {

    const results: string[] = [];

    for (let i = 0; i < text.length; i++) {

        if (text[i] !== '{') continue;

        // sprawdź czy to Binding
        const rest = text.slice(i);
        const match = rest.match(/^\{\s*Binding\b/);

        if (!match) continue;

        let depth = 0;
        let j = i;

        for (; j < text.length; j++) {

            if (text[j] === '{') depth++;
            if (text[j] === '}') depth--;

            if (depth === 0) break;
        }

        if (depth === 0) {
            const full = text.slice(i, j + 1);

            // usuń "{Binding" i końcowe "}"
            const inner = full
                .replace(/^\{\s*Binding\s*/, '')
                .slice(0, -1);

            results.push(inner);

            i = j; // skip dalej
        }
    }

    return results;
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
