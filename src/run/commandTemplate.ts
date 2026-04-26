import type { ResolvedPythonTarget } from "../types.js";

export interface CommandTemplateContext {
    fileBasename: string;
    fileDirname: string;
    pytestFunction: string;
    pytestTarget: string;
    testFunction: string;
    testTarget: string;
    script: string;
    workspaceFolder: string;
}

export interface CommandTemplateContextOverrides {
    pytestFunction?: string;
    pytestTarget?: string;
    testFunction?: string;
    testTarget?: string;
}

function quoteForShell(value: string): string {
    if (process.platform === "win32") {
        return `"${value.replace(/"/g, '\\"')}"`;
    }

    return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildCommandTemplateContext(
    target: ResolvedPythonTarget,
    overrides: CommandTemplateContextOverrides = {},
): CommandTemplateContext {
    const testFunction = overrides.testFunction ?? overrides.pytestFunction ?? "";
    const testTarget = overrides.testTarget ?? overrides.pytestTarget ?? target.filePath;

    return {
        fileBasename: target.fileBasename,
        fileDirname: target.fileDirname,
        pytestFunction: overrides.pytestFunction ?? testFunction,
        pytestTarget: overrides.pytestTarget ?? testTarget,
        script: target.filePath,
        testFunction,
        testTarget,
        workspaceFolder: target.workspaceFolder.uri.fsPath,
    };
}

export function expandCommandTemplate(template: string, context: CommandTemplateContext): string {
    return template
        .replaceAll("{script}", quoteForShell(context.script))
        .replaceAll("{workspaceFolder}", quoteForShell(context.workspaceFolder))
        .replaceAll("{fileDirname}", quoteForShell(context.fileDirname))
        .replaceAll("{fileBasename}", quoteForShell(context.fileBasename))
        .replaceAll("{testTarget}", quoteForShell(context.testTarget))
        .replaceAll("{testFunction}", quoteForShell(context.testFunction))
        .replaceAll("{pytestTarget}", quoteForShell(context.pytestTarget))
        .replaceAll("{pytestFunction}", quoteForShell(context.pytestFunction));
}
