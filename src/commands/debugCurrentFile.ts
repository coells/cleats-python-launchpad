import * as vscode from "vscode";

import {
    isDebugTargetBusy,
    shouldOpenNewDebugTerminalIfBusy,
    startDebuggingWithBusyTracking,
    withDebugInvocationSuffix,
} from "../debug/debugBusyTerminal.js";
import { buildPytestDebugConfig } from "../debug/pytestDebugConfig.js";
import { buildUnittestDebugConfig } from "../debug/unittestDebugConfig.js";
import { ensurePythonExtension } from "../python/pythonExtension.js";
import { resolveActivePythonTarget } from "../resolvePythonTarget.js";
import { resolvePytestTargetForPosition } from "../run/pytestTarget.js";
import { resolveUnittestTargetForPosition } from "../run/unittestTarget.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import { prepareManagedCommandExecution } from "./commandExecution.js";
import { formatDebugStartFailureMessage } from "./commandExecutionModel.js";

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

    const preparedExecution = await prepareManagedCommandExecution(target, {
        generatedLaunchNamePrefix,
        launchJsonPath,
        managedTargetConfigurationLimit,
        launchConfigurationTemplate,
        runCommandTemplate,
        testCommandTemplate,
        executeDialogEnabled,
    });
    if (!preparedExecution) {
        return;
    }

    const { managed, testFramework } = preparedExecution;
    const isBusy = isDebugTargetBusy(target);
    if (isBusy && !debugOpenNewTerminalIfBusy) {
        await vscode.window.showInformationMessage(
            `A debug session for ${target.fileBasename} is already running. Stop it first or enable debugOpenNewTerminalIfBusy.`,
        );
        return;
    }

    const openNewDebugTerminal = shouldOpenNewDebugTerminalIfBusy(target, debugOpenNewTerminalIfBusy);
    const startDebugging = async (
        launchWorkspaceFolder: vscode.WorkspaceFolder,
        debugConfig: string | vscode.DebugConfiguration,
        framework: "pytest" | "unittest" | undefined,
    ): Promise<void> => {
        const started = await startDebuggingWithBusyTracking(target, launchWorkspaceFolder, debugConfig);
        if (!started) {
            await vscode.window.showErrorMessage(formatDebugStartFailureMessage(target.fileBasename, framework));
        }
    };

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
        await startDebugging(target.workspaceFolder, debugConfig, "pytest");
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
        await startDebugging(target.workspaceFolder, debugConfig, "unittest");
        return;
    }

    await lastTargetStore.set(target);

    await startDebugging(
        managed.launchWorkspaceFolder,
        withDebugInvocationSuffix(managed.debugConfig.name as string, openNewDebugTerminal, managed.debugConfig),
        undefined,
    );
}
