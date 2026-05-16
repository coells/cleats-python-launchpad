import path from "node:path";

import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";
import { parsePythonScopesUntilLine } from "./pythonScope.js";

export interface UnittestTargetSelection {
    testFunction: string;
    testTarget: string;
    unittestFilter?: string;
}

const MODULE_PART_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function resolveScopeChain(source: string, cursorLine: number): string[] {
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
        return [];
    }

    const classNames = scopes
        .slice(0, functionIndex)
        .filter((scope) => scope.kind === "class")
        .map((scope) => scope.name);

    return [...classNames, scopes[functionIndex].name];
}

function toModulePath(target: ResolvedPythonTarget): string | undefined {
    const workspaceRelativePath = path.relative(target.workspaceFolder.uri.fsPath, target.filePath);
    if (workspaceRelativePath.startsWith("..")) {
        return undefined;
    }

    const withoutExtension = workspaceRelativePath.replace(/\.py$/u, "");
    const moduleParts = withoutExtension.split(path.sep).filter((part) => part.length > 0);
    if (moduleParts.length === 0) {
        return undefined;
    }

    if (moduleParts.some((part) => !MODULE_PART_PATTERN.test(part))) {
        return undefined;
    }

    return moduleParts.join(".");
}

export function resolveUnittestTargetFromSource(
    target: ResolvedPythonTarget,
    source: string,
    cursorLine: number,
): UnittestTargetSelection {
    const scopeChain = resolveScopeChain(source, cursorLine);
    if (scopeChain.length === 0) {
        return {
            testFunction: "",
            testTarget: target.filePath,
        };
    }

    const modulePath = toModulePath(target);
    if (!modulePath) {
        return {
            testFunction: scopeChain.join("."),
            testTarget: target.filePath,
            unittestFilter: scopeChain.join("."),
        };
    }

    return {
        testFunction: scopeChain.join("."),
        testTarget: `${modulePath}.${scopeChain.join(".")}`,
    };
}

export function resolveUnittestTargetForPosition(
    target: ResolvedPythonTarget,
    position: vscode.Position | undefined,
): UnittestTargetSelection {
    if (!position) {
        return {
            testFunction: "",
            testTarget: target.filePath,
        };
    }

    return resolveUnittestTargetFromSource(target, target.document.getText(), position.line);
}
