import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";

function stripManagedMetadata(config: vscode.DebugConfiguration): Record<string, unknown> {
    const normalized = {
        ...config,
    } as Record<string, unknown>;

    for (const key of Object.keys(normalized)) {
        if (key.startsWith("cleatsPythonLaunchpad")) {
            delete normalized[key];
        }
    }

    delete normalized.managedBy;
    delete normalized.managedRole;
    return normalized;
}

function toInlineDebugBaseConfig(baseConfig?: vscode.DebugConfiguration): Record<string, unknown> {
    const base = baseConfig ? stripManagedMetadata(baseConfig) : {};
    delete base.program;
    delete base.code;
    return base;
}

export function buildInlineModuleDebugConfig(
    target: ResolvedPythonTarget,
    moduleName: string,
    args: string[],
    nameSuffix: string,
    baseConfig?: vscode.DebugConfiguration,
): vscode.DebugConfiguration {
    const base = toInlineDebugBaseConfig(baseConfig);

    return {
        ...base,
        name: `Debug: ${target.fileBasename} (${nameSuffix})`,
        type: typeof base.type === "string" ? base.type : "debugpy",
        request: typeof base.request === "string" ? base.request : "launch",
        module: moduleName,
        args,
        cwd: typeof base.cwd === "string" && base.cwd.trim().length > 0 ? base.cwd : target.workspaceFolder.uri.fsPath,
        console: typeof base.console === "string" ? base.console : "integratedTerminal",
        justMyCode: typeof base.justMyCode === "boolean" ? base.justMyCode : true,
    };
}
