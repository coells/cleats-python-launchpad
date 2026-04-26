import * as vscode from "vscode";

import type { PythonTestFramework, ResolvedPythonTarget } from "../types.js";
import { isTestFile } from "./testFile.js";

export { isTestFile };

export function resolveConfiguredTestFramework(target: ResolvedPythonTarget): PythonTestFramework | undefined {
    const pythonConfiguration = vscode.workspace.getConfiguration("python", target.fileUri);
    const pytestEnabled = pythonConfiguration.get<boolean>("testing.pytestEnabled", false);
    const unittestEnabled = pythonConfiguration.get<boolean>("testing.unittestEnabled", false);

    if (pytestEnabled) {
        return "pytest";
    }

    if (unittestEnabled) {
        return "unittest";
    }

    return undefined;
}
