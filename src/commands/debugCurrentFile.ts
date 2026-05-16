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
import { resolveActivePythonTarget } from "../resolvePythonTarget.js";
import { RUN_COMMAND_TEMPLATE_ENV_KEY, TEST_COMMAND_TEMPLATE_ENV_KEY } from "../run/commandTemplate.js";
import { resolvePytestTargetForPosition } from "../run/pytestTarget.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import { resolveUnittestTargetForPosition } from "../run/unittestTarget.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import { resolveSettingsForExecution } from "./executeDialogSettings.js";

/**
 * Debugs the active Python target.
 * For pytest files, debugs the current function/method when cursor is inside one.
 */
export async function debugCurrentFile(
    lastTargetStore: LastTargetStore,
    generatedLaunchNamePrefix: string,
    runCommandTemplate: string,
    testCommandTemplate: string,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
    debugOpenNewTerminalIfBusy: boolean,
    launchConfigurationTemplate: Record<string, unknown>,
    executeDialogEnabled: boolean,
): Promise<void> {
    const target = await resolveActivePythonTarget();
    if (!target) {
        return;
    }

    if (!(await ensurePythonExtension())) {
        return;
    }

    const testFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    const commandTemplateEnvKeyToCopy = testFramework ? TEST_COMMAND_TEMPLATE_ENV_KEY : RUN_COMMAND_TEMPLATE_ENV_KEY;
    const executionSettings = await resolveSettingsForExecution(
        target,
        {
            generatedLaunchNamePrefix,
            launchJsonPath,
            managedTargetConfigurationLimit,
            launchConfigurationTemplate,
            runCommandTemplate,
            testCommandTemplate,
        },
        commandTemplateEnvKeyToCopy,
        executeDialogEnabled,
    );
    if (!executionSettings) {
        return;
    }

    const managed = await ensureManagedLaunchConfig(
        target,
        executionSettings.generatedLaunchNamePrefix,
        executionSettings.launchJsonPath,
        commandTemplateEnvKeyToCopy,
        executionSettings.managedTargetConfigurationLimit,
        executionSettings.launchConfigurationTemplate,
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
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const pytestSelection = resolvePytestTargetForPosition(target, activePosition);
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestSelection.testFunction,
            testTarget: pytestSelection.testTarget,
        });

        const debugConfig = withDebugInvocationSuffix(
            buildPytestDebugConfig(target, pytestSelection.testTarget, managed.debugConfig),
            openNewDebugTerminal,
        );
        const started = await startDebuggingWithBusyTracking(target, target.workspaceFolder, debugConfig);
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
            testFunction: unittestSelection.testFunction,
            testTarget: unittestSelection.testTarget,
        });

        const debugConfig = withDebugInvocationSuffix(
            buildUnittestDebugConfig(
                target,
                unittestSelection.testTarget,
                unittestSelection.unittestFilter,
                managed.debugConfig,
            ),
            openNewDebugTerminal,
        );
        const started = await startDebuggingWithBusyTracking(target, target.workspaceFolder, debugConfig);
        if (!started) {
            await vscode.window.showErrorMessage(`Failed to start unittest debugging for ${target.fileBasename}.`);
        }
        return;
    }

    await lastTargetStore.set(target);

    const started = await startDebuggingWithBusyTracking(
        target,
        managed.launchWorkspaceFolder,
        withDebugInvocationSuffix(managed.debugConfig.name as string, openNewDebugTerminal, managed.debugConfig),
    );
    if (!started) {
        await vscode.window.showErrorMessage(`Failed to start debugging for ${target.fileBasename}.`);
    }
}
