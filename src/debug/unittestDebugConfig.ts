import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";
import { buildInlineModuleDebugConfig } from "./inlineDebugConfig.js";

export function buildUnittestDebugConfig(
    target: ResolvedPythonTarget,
    unittestTarget: string,
    unittestFilter?: string,
    baseConfig?: vscode.DebugConfiguration,
): vscode.DebugConfiguration {
    const args = [unittestTarget, ...(unittestFilter ? ["-k", unittestFilter] : [])];

    return buildInlineModuleDebugConfig(target, "unittest", args, "unittest", baseConfig);
}
