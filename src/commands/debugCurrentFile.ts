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

/**
 * Debugs the active Python target.
 * For pytest files, debugs the current function/method when cursor is inside one.
 */
export async function debugCurrentFile(
    lastTargetStore: LastTargetStore,
    generatedLaunchNamePrefix: string,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
    debugOpenNewTerminalIfBusy: boolean,
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
        const started = await startDebuggingWithBusyTracking(target, managed.launchWorkspaceFolder, debugConfig);
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
