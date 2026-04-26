import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";

function stripManagedMetadata(config: vscode.DebugConfiguration): vscode.DebugConfiguration {
    const normalized = {
        ...config,
    };

    for (const key of Object.keys(normalized as Record<string, unknown>)) {
        if (key.startsWith("cleatsLaunchpad") || key.startsWith("cleatsPythonLaunchpad")) {
            delete (normalized as Record<string, unknown>)[key];
        }
    }

    delete (normalized as Record<string, unknown>).managedBy;
    delete (normalized as Record<string, unknown>).managedRole;
    delete (normalized as Record<string, unknown>).runCommandTemplate;
    delete (normalized as Record<string, unknown>).runCommandTemplateRef;
    return normalized;
}

export function buildUnittestDebugConfig(
    target: ResolvedPythonTarget,
    unittestTarget: string,
    unittestFilter?: string,
    baseConfig?: vscode.DebugConfiguration,
): vscode.DebugConfiguration {
    const base = (baseConfig ? stripManagedMetadata(baseConfig) : {}) as Record<string, unknown>;
    delete base.program;
    delete base.code;

    const args = [unittestTarget, ...(unittestFilter ? ["-k", unittestFilter] : [])];

    return {
        ...base,
        name: `Debug: ${target.fileBasename} (unittest)`,
        type: typeof base.type === "string" ? base.type : "debugpy",
        request: typeof base.request === "string" ? base.request : "launch",
        module: "unittest",
        args,
        cwd: typeof base.cwd === "string" && base.cwd !== "${fileDirname}" ? base.cwd : target.fileDirname,
        console: typeof base.console === "string" ? base.console : "integratedTerminal",
        justMyCode: typeof base.justMyCode === "boolean" ? base.justMyCode : true,
    };
}
