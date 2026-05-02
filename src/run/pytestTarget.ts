import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";

export interface PytestTargetSelection {
    testFunction: string;
    testTarget: string;
}

interface ParsedScope {
    indent: number;
    kind: "class" | "function";
    name: string;
}

const PYTEST_FILE_PATTERN = /(^test_.*\.py$|.*_test\.py$)/;
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

function parseScopesUntilLine(lines: readonly string[], lineNumber: number): ParsedScope[] {
    const scopes: ParsedScope[] = [];

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

export function isPytestFile(fileBasename: string): boolean {
    return PYTEST_FILE_PATTERN.test(fileBasename);
}

/**
 * Resolves a pytest node id from source text and cursor line.
 * Falls back to the file path when the cursor is outside any function.
 */
export function resolvePytestTargetFromSource(
    filePath: string,
    source: string,
    cursorLine: number,
): PytestTargetSelection {
    const lines = source.split(/\r?\n/u);
    const scopes = parseScopesUntilLine(lines, cursorLine);
    let functionIndex = -1;
    for (let index = scopes.length - 1; index >= 0; index -= 1) {
        if (scopes[index].kind === "function") {
            functionIndex = index;
            break;
        }
    }

    if (functionIndex === -1) {
        return {
            testFunction: "",
            testTarget: filePath,
        };
    }

    const functionScope = scopes[functionIndex];
    const classNames = scopes
        .slice(0, functionIndex)
        .filter((scope) => scope.kind === "class")
        .map((scope) => scope.name);

    return {
        testFunction: functionScope.name,
        testTarget: [filePath, ...classNames, functionScope.name].join("::"),
    };
}

/**
 * Resolves pytest target information for the current editor position.
 */
export function resolvePytestTargetForPosition(
    target: ResolvedPythonTarget,
    position: vscode.Position | undefined,
): PytestTargetSelection {
    if (!position) {
        return {
            testFunction: "",
            testTarget: target.filePath,
        };
    }

    return resolvePytestTargetFromSource(target.filePath, target.document.getText(), position.line);
}
