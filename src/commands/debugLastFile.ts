import * as vscode from "vscode";

import {
    isDebugTargetBusy,
    shouldOpenNewDebugTerminalIfBusy,
    startDebuggingWithBusyTracking,
    withDebugInvocationSuffix,
} from "../debug/debugBusyTerminal.js";
import { buildPytestDebugConfig } from "../debug/pytestDebugConfig.js";
import { buildUnittestDebugConfig } from "../debug/unittestDebugConfig.js";
import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { ensurePythonExtension } from "../python/pythonExtension.js";
import { resolveStoredPythonTarget } from "../resolvePythonTarget.js";
import { RUN_COMMAND_TEMPLATE_ENV_KEY, TEST_COMMAND_TEMPLATE_ENV_KEY } from "../run/commandTemplate.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";

/**
 * Debugs the most recently resolved Python target.
 * For pytest files, debugs the file target (last-file has no active cursor context).
 */
export async function debugLastFile(
    lastTargetStore: LastTargetStore,
    generatedLaunchNamePrefix: string,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
    debugOpenNewTerminalIfBusy: boolean,
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

    const configuredFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    const testFramework = lastTarget.testFramework ?? configuredFramework;
    const commandTemplateEnvKeyToCopy = testFramework ? TEST_COMMAND_TEMPLATE_ENV_KEY : RUN_COMMAND_TEMPLATE_ENV_KEY;

    const managed = await ensureManagedLaunchConfig(
        target,
        generatedLaunchNamePrefix,
        launchJsonPath,
        managedTargetConfigurationLimit,
        commandTemplateEnvKeyToCopy,
    );
    const isBusy = isDebugTargetBusy(target);
    if (isBusy && !debugOpenNewTerminalIfBusy) {
        await vscode.window.showInformationMessage(
            `A debug session for ${target.fileBasename} is already running. Stop it first or enable debugOpenNewTerminalIfBusy.`,
        );
        return;
    }

    const openNewDebugTerminal = shouldOpenNewDebugTerminalIfBusy(target, debugOpenNewTerminalIfBusy);

    if (testFramework === "pytest") {
        const pytestTarget = lastTarget.testTarget ?? target.filePath;
        const pytestFunction = lastTarget.testFunction ?? "";
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestFunction,
            testTarget: pytestTarget,
        });

        const debugConfig = withDebugInvocationSuffix(
            buildPytestDebugConfig(target, pytestTarget, managed.debugConfig),
            openNewDebugTerminal,
        );
        const started = await startDebuggingWithBusyTracking(target, managed.launchWorkspaceFolder, debugConfig);
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

        const debugConfig = withDebugInvocationSuffix(
            buildUnittestDebugConfig(target, unittestTarget, unittestFilter, managed.debugConfig),
            openNewDebugTerminal,
        );
        const started = await startDebuggingWithBusyTracking(target, managed.launchWorkspaceFolder, debugConfig);
        if (!started) {
            await vscode.window.showErrorMessage(`Failed to start unittest debugging for ${target.fileBasename}.`);
        }
        return;
    }

    await lastTargetStore.set(target);

    const started = await startDebuggingWithBusyTracking(
        target,
        managed.launchWorkspaceFolder,
        withDebugInvocationSuffix(managed.debugConfig, openNewDebugTerminal),
    );
    if (!started) {
        await vscode.window.showErrorMessage(`Failed to start debugging for ${target.fileBasename}.`);
    }
}
