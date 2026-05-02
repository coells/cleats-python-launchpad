import * as vscode from "vscode";

import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { resolveStoredPythonTarget } from "../resolvePythonTarget.js";
import { runPythonTarget } from "../run/runTask.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { TerminalRevealSetting } from "../types.js";

export async function runLastFile(
    lastTargetStore: LastTargetStore,
    scriptCommandTemplate: string,
    testCommandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    generatedLaunchNamePrefix: string,
    runOpenNewTerminalIfBusy: boolean,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
): Promise<void> {
    const lastTarget = lastTargetStore.get();
    if (!lastTarget) {
        await vscode.window.showWarningMessage("No previous Python file has been run or debugged in this workspace.");
        return;
    }

    const target = await resolveStoredPythonTarget(
        vscode.Uri.file(lastTarget.filePath),
        lastTarget.workspaceFolderPath,
    );
    if (!target) {
        await lastTargetStore.clear();
        await vscode.window.showWarningMessage(
            "The previous Python target is no longer available. Open a Python file and run it again.",
        );
        return;
    }

    await ensureManagedLaunchConfig(target, generatedLaunchNamePrefix, launchJsonPath, managedTargetConfigurationLimit);

    const configuredFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    const testFramework = lastTarget.testFramework ?? configuredFramework;

    if (testFramework === "pytest") {
        const pytestTarget = lastTarget.testTarget ?? target.filePath;
        const pytestFunction = lastTarget.testFunction ?? "";

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestFunction,
            testTarget: pytestTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            testFunction: pytestFunction,
            testTarget: pytestTarget,
        });
        return;
    }

    if (testFramework === "unittest") {
        const unittestTarget = lastTarget.testTarget ?? target.filePath;
        const unittestFunction = lastTarget.testFunction ?? "";

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, scriptCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy);
}
