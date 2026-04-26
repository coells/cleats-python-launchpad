import * as vscode from "vscode";

import { buildPytestDebugConfig } from "../debug/pytestDebugConfig.js";
import { buildUnittestDebugConfig } from "../debug/unittestDebugConfig.js";
import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { ensurePythonExtension } from "../python/pythonExtension.js";
import { resolveActivePythonTarget } from "../resolvePythonTarget.js";
import { resolvePytestTargetForPosition } from "../run/pytestTarget.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import { resolveUnittestTargetForPosition } from "../run/unittestTarget.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";

/**
 * Debugs the active Python target.
 * For pytest files, debugs the current function/method when cursor is inside one.
 */
export async function debugCurrentFile(
    lastTargetStore: LastTargetStore,
    generatedLaunchNamePrefix: string,
    defaultRunCommandTemplate: string,
    launchWorkspaceFolder: string,
): Promise<void> {
    const target = await resolveActivePythonTarget();
    if (!target) {
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

    const testFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    if (testFramework === "pytest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const pytestSelection = resolvePytestTargetForPosition(target, activePosition);
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestSelection.pytestFunction,
            testTarget: pytestSelection.pytestTarget,
        });

        const started = await vscode.debug.startDebugging(
            managed.launchWorkspaceFolder,
            buildPytestDebugConfig(target, pytestSelection.pytestTarget, managed.debugConfig),
        );
        if (!started) {
            await vscode.window.showErrorMessage(`Failed to start pytest debugging for ${target.fileBasename}.`);
        }
        return;
    }

    if (testFramework === "unittest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const unittestSelection = resolveUnittestTargetForPosition(target, activePosition);
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestSelection.pytestFunction,
            testTarget: unittestSelection.pytestTarget,
        });

        const started = await vscode.debug.startDebugging(
            managed.launchWorkspaceFolder,
            buildUnittestDebugConfig(
                target,
                unittestSelection.pytestTarget,
                unittestSelection.unittestFilter,
                managed.debugConfig,
            ),
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
