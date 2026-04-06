// PURE LOGIC — ZERO vscode

export function rewriteBindings(
    xaml: string,
    bindings: BindingInfo[]
): string {

    let result = xaml;

    for (const b of bindings) {

        if (b.prop === b.path) continue;

        const safePath = b.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const regex = new RegExp(
            `\\{\\s*Binding([^}]*)${safePath}([^}]*)\\}`,
            'g'
        );

        result = result.replace(regex, (match) => {
            return match.replace(b.path, b.prop);
        });
    }

    return result;
}


export type BindingInfo = {
    prop: string;
    path: string;
};

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

// =========================
// BINDINGS
// =========================

export function extractBindings(text: string): BindingInfo[] {

    const result: BindingInfo[] = [];
    const bindings = extractBindingBlocks(text);

    for (const contentRaw of bindings) {

        let content = contentRaw.trim();
        if (!content) continue;

        const hasSource = content.includes('Source=');
        const hasPath = content.includes('Path=');

        if (hasSource && !hasPath) continue;

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

        pathCandidate = pathCandidate
            .replace(/\[.*?\]/g, '')
            .replace(/\?\./g, '.')
            .trim();

        if (pathCandidate === '.' || pathCandidate === '') continue;

        const segments = pathCandidate.split('.');
        const last = segments[segments.length - 1];

        if (!last) continue;

        result.push({
            prop: last,
            path: pathCandidate
        });
    }

    const map = new Map<string, string>();

    for (const b of result) {
        if (!map.has(b.prop)) {
            map.set(b.prop, b.path);
        }
    }

    return Array.from(map.entries()).map(([prop, path]) => ({ prop, path }));
}

function extractBindingBlocks(text: string): string[] {

    const results: string[] = [];

    for (let i = 0; i < text.length; i++) {

        if (text[i] !== '{') continue;

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

            const inner = full
                .replace(/^\{\s*Binding\s*/, '')
                .slice(0, -1);

            results.push(inner);

            i = j;
        }
    }

    return results;
}

// =========================
// GENERATORS
// =========================

export function generateBindableProperties(bindings: BindingInfo[], controlName: string): string {

    if (bindings.length === 0) return '';

    return bindings.map(b => {

        const name = b.prop;

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

export function resolveNamespacePrefix(
    namespace: string,
    extraXmlns: string
): { prefix: string; xmlnsToAdd: string } {

    const xmlnsRegex = /xmlns:(\w+)="clr-namespace:([^"]+)"/g;

    let match;


    while ((match = xmlnsRegex.exec(extraXmlns)) !== null) {
        const prefix = match[1];
        const ns = match[2];

        if (ns === namespace) {
            return { prefix, xmlnsToAdd: '' };
        }
    }


    const used = new Set<string>();

    while ((match = xmlnsRegex.exec(extraXmlns)) !== null) {
        used.add(match[1]);
    }


    const base = (namespace.split('.').pop() || 'local').toLowerCase();

    let prefix = base;
    let i = 1;

    while (used.has(prefix)) {
        prefix = `${base}${i++}`;
    }


    const xmlns = `xmlns:${prefix}="clr-namespace:${namespace}"`;

    return {
        prefix,
        xmlnsToAdd: xmlns
    };
}



export function generateXaml(
    fullClass: string,
    content: string,
    extraXmlns: string
): string {

    const namespace = fullClass.substring(0, fullClass.lastIndexOf('.'));
    const className = fullClass.substring(fullClass.lastIndexOf('.') + 1);

    const { prefix, xmlnsToAdd } = resolveNamespacePrefix(namespace, extraXmlns);

    const xmlnsLine = xmlnsToAdd
        ? `\n             ${xmlnsToAdd}`
        : '';

    return `
<ContentView xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
             xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"${xmlnsLine}${extraXmlns}
             x:Class="${fullClass}"
             x:DataType="${prefix}:${className}">
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

// =========================
// CONTROL USAGE
// =========================

export function generateControlUsage(
    prefix: string,
    name: string,
    bindings: BindingInfo[]
): string {

    if (bindings.length === 0) {
        return `<${prefix}:${name} />`;
    }

    const props = bindings
        .map(b => `${b.prop}="{Binding ${b.path}}"`)
        .join('\n    ');

    return `
<${prefix}:${name}
    ${props} />`.trim();
}
