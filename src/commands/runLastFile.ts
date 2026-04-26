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
    pytestCommandTemplate: string,
    unittestCommandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    generatedLaunchNamePrefix: string,
    runOpenNewTerminalIfBusy: boolean,
    launchWorkspaceFolder: string,
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

    const managed = await ensureManagedLaunchConfig(
        target,
        generatedLaunchNamePrefix,
        scriptCommandTemplate,
        launchWorkspaceFolder,
    );

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
        await runPythonTarget(target, pytestCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            pytestFunction,
            pytestTarget,
            testFunction: pytestFunction,
            testTarget: pytestTarget,
        });
        return;
    }

    if (testFramework === "unittest") {
        const unittestTarget = lastTarget.testTarget ?? target.filePath;
        const unittestFunction = lastTarget.testFunction ?? "";
        const needsFilter = unittestFunction.length > 0 && unittestTarget === target.filePath;
        const unittestTemplate = needsFilter ? `${unittestCommandTemplate} -k {testFunction}` : unittestCommandTemplate;

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });
        await runPythonTarget(target, unittestTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            pytestFunction: unittestFunction,
            pytestTarget: unittestTarget,
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, managed.runCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy);
}
