import type { ResolvedPythonTarget } from "../types.js";

export const RUN_COMMAND_TEMPLATE = "python {script}";
export const TEST_COMMAND_TEMPLATE = "python -m pytest {testTarget}";
export const RUN_COMMAND_TEMPLATE_ENV_KEY = "PYTHON_LAUNCHPAD_RUN_COMMAND";
export const TEST_COMMAND_TEMPLATE_ENV_KEY = "PYTHON_LAUNCHPAD_TEST_COMMAND";
export type CommandTemplateEnvKey = typeof RUN_COMMAND_TEMPLATE_ENV_KEY | typeof TEST_COMMAND_TEMPLATE_ENV_KEY;

export interface CommandTemplateContext {
    fileBasename: string;
    fileDirname: string;
    testFunction: string;
    testTarget: string;
    script: string;
    workspaceFolder: string;
}

export interface CommandTemplateContextOverrides {
    testFunction?: string;
    testTarget?: string;
}

export function resolveCommandTemplateFromEnv(env: unknown, envKey: string, fallbackTemplate: string): string {
    if (!env || typeof env !== "object") {
        return fallbackTemplate;
    }

    const value = (env as Record<string, unknown>)[envKey];
    if (typeof value !== "string") {
        return fallbackTemplate;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallbackTemplate;
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
    const testFunction = overrides.testFunction ?? "";
    const testTarget = overrides.testTarget ?? target.filePath;

    return {
        fileBasename: target.fileBasename,
        fileDirname: target.fileDirname,
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
        .replaceAll("{testFunction}", quoteForShell(context.testFunction));
}
