import * as vscode from "vscode";

import { buildPytestDebugConfig } from "../debug/pytestDebugConfig.js";
import { buildUnittestDebugConfig } from "../debug/unittestDebugConfig.js";
import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { ensurePythonExtension } from "../python/pythonExtension.js";
import { resolveStoredPythonTarget } from "../resolvePythonTarget.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";

/**
 * Debugs the most recently resolved Python target.
 * For pytest files, debugs the file target (last-file has no active cursor context).
 */
export async function debugLastFile(
    lastTargetStore: LastTargetStore,
    generatedLaunchNamePrefix: string,
    defaultRunCommandTemplate: string,
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

    if (!(await ensurePythonExtension())) {
        return;
    }

    const managed = await ensureManagedLaunchConfig(
        target,
        generatedLaunchNamePrefix,
        defaultRunCommandTemplate,
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

        const started = await vscode.debug.startDebugging(
            managed.launchWorkspaceFolder,
            buildPytestDebugConfig(target, pytestTarget, managed.debugConfig),
        );
        if (!started) {
            await vscode.window.showErrorMessage(`Failed to start pytest debugging for ${target.fileBasename}.`);
        }
        return;
    }

    if (testFramework === "unittest") {
        const unittestTarget = lastTarget.testTarget ?? target.filePath;
        const unittestFunction = lastTarget.testFunction ?? "";
        const unittestFilter =
            unittestFunction.length > 0 && unittestTarget === target.filePath ? unittestFunction : undefined;
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });

        const started = await vscode.debug.startDebugging(
            managed.launchWorkspaceFolder,
            buildUnittestDebugConfig(target, unittestTarget, unittestFilter, managed.debugConfig),
        );
        if (!started) {
            await vscode.window.showErrorMessage(`Failed to start unittest debugging for ${target.fileBasename}.`);
        }
        return;
    }

    await lastTargetStore.set(target);

    const started = await vscode.debug.startDebugging(managed.launchWorkspaceFolder, managed.debugConfig);
    if (!started) {
        await vscode.window.showErrorMessage(`Failed to start debugging for ${target.fileBasename}.`);
    }
}
