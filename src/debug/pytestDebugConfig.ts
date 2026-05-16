import type * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";
import { buildInlineModuleDebugConfig } from "./inlineDebugConfig.js";

/**
 * Builds an inline debugpy configuration that launches pytest with a concrete node id.
 */
export function buildPytestDebugConfig(
    target: ResolvedPythonTarget,
    pytestTarget: string,
    baseConfig?: vscode.DebugConfiguration,
): vscode.DebugConfiguration {
    return buildInlineModuleDebugConfig(target, "pytest", [pytestTarget], "pytest", baseConfig);
}
