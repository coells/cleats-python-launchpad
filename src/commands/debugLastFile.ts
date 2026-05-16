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
import type { LastTargetStore } from "../state/lastTargetStore.js";
import { prepareManagedCommandExecution, resolveLastCommandTarget } from "./commandExecution.js";
import { formatDebugStartFailureMessage, resolveLastUnittestFilter } from "./commandExecutionModel.js";

/**
 * Debugs the most recently resolved Python target.
 * For pytest files, debugs the file target (last-file has no active cursor context).
 */
export async function debugLastFile(
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
    const resolvedLastTarget = await resolveLastCommandTarget(lastTargetStore);
    if (!resolvedLastTarget) {
        return;
    }

    const { lastTarget, target } = resolvedLastTarget;

    if (!(await ensurePythonExtension())) {
        return;
    }

    const preparedExecution = await prepareManagedCommandExecution(
        target,
        {
            generatedLaunchNamePrefix,
            launchJsonPath,
            managedTargetConfigurationLimit,
            launchConfigurationTemplate,
            runCommandTemplate,
            testCommandTemplate,
            executeDialogEnabled,
        },
        lastTarget.testFramework,
    );
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
        await startDebugging(target.workspaceFolder, debugConfig, "pytest");
        return;
    }

    if (testFramework === "unittest") {
        const unittestTarget = lastTarget.testTarget ?? target.filePath;
        const unittestFunction = lastTarget.testFunction ?? "";
        const unittestFilter = resolveLastUnittestFilter(unittestFunction, unittestTarget, target.filePath);
        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestFunction,
            testTarget: unittestTarget,
        });

        const debugConfig = withDebugInvocationSuffix(
            buildUnittestDebugConfig(target, unittestTarget, unittestFilter, managed.debugConfig),
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
