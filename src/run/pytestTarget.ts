import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";
import { parsePythonScopesUntilLine } from "./pythonScope.js";

export interface PytestTargetSelection {
    testFunction: string;
    testTarget: string;
}

const PYTEST_FILE_PATTERN = /(^test_.*\.py$|.*_test\.py$)/;

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
    const scopes = parsePythonScopesUntilLine(lines, cursorLine);
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
