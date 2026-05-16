export interface PythonParsedScope {
    indent: number;
    kind: "class" | "function";
    name: string;
}

const CLASS_PATTERN = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\b[^:]*:/;
const FUNCTION_PATTERN = /^(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;

function measureIndent(line: string): number {
    let width = 0;
    for (const character of line) {
        if (character === " ") {
            width += 1;
            continue;
        }

        if (character === "\t") {
            width += 4;
            continue;
        }

        break;
    }

    return width;
}

export function parsePythonScopesUntilLine(lines: readonly string[], lineNumber: number): PythonParsedScope[] {
    const scopes: PythonParsedScope[] = [];

    const maxLine = Math.min(Math.max(lineNumber, 0), Math.max(lines.length - 1, 0));
    for (let lineIndex = 0; lineIndex <= maxLine; lineIndex += 1) {
        const line = lines[lineIndex] ?? "";
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) {
            continue;
        }

        const indent = measureIndent(line);
        while (scopes.length > 0 && indent <= scopes[scopes.length - 1].indent) {
            scopes.pop();
        }

        const classMatch = trimmed.match(CLASS_PATTERN);
        if (classMatch) {
            scopes.push({
                indent,
                kind: "class",
                name: classMatch[1],
            });
            continue;
        }

        const functionMatch = trimmed.match(FUNCTION_PATTERN);
        if (functionMatch) {
            scopes.push({
                indent,
                kind: "function",
                name: functionMatch[1],
            });
        }
    }

    return scopes;
}
