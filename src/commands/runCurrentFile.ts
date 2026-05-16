import * as vscode from "vscode";

import { resolveActivePythonTarget } from "../resolvePythonTarget.js";
import {
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    resolveCommandTemplateFromEnv,
} from "../run/commandTemplate.js";
import { resolveManagedRunEnvironment } from "../run/managedRunEnvironment.js";
import { resolvePytestTargetForPosition } from "../run/pytestTarget.js";
import { runPythonTarget } from "../run/runTask.js";
import { resolveUnittestTargetForPosition } from "../run/unittestTarget.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { TerminalRevealSetting } from "../types.js";
import { buildNamedWorkspaceFolderPaths, prepareManagedCommandExecution } from "./commandExecution.js";

export async function runCurrentFile(
    lastTargetStore: LastTargetStore,
    terminalReveal: TerminalRevealSetting,
    generatedLaunchNamePrefix: string,
    runOpenNewTerminalIfBusy: boolean,
    configuredRunCommandTemplate: string,
    configuredTestCommandTemplate: string,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
    launchConfigurationTemplate: Record<string, unknown>,
    executeDialogEnabled: boolean,
): Promise<void> {
    const target = await resolveActivePythonTarget();
    if (!target) {
        return;
    }

    const preparedExecution = await prepareManagedCommandExecution(target, {
        generatedLaunchNamePrefix,
        launchJsonPath,
        managedTargetConfigurationLimit,
        launchConfigurationTemplate,
        runCommandTemplate: configuredRunCommandTemplate,
        testCommandTemplate: configuredTestCommandTemplate,
        executeDialogEnabled,
    });
    if (!preparedExecution) {
        return;
    }

    const { managed, testFramework } = preparedExecution;
    const managedDebugConfig = managed.debugConfig as Record<string, unknown>;
    const managedRunEnvironment = await resolveManagedRunEnvironment(
        target,
        managed.launchWorkspaceFolder,
        managedDebugConfig,
    );
    const managedEnv = managedRunEnvironment.commandTemplateEnv;
    const scriptCommandTemplate = resolveCommandTemplateFromEnv(
        managedEnv,
        RUN_COMMAND_TEMPLATE_ENV_KEY,
        RUN_COMMAND_TEMPLATE,
    );
    const testCommandTemplate = resolveCommandTemplateFromEnv(
        managedEnv,
        TEST_COMMAND_TEMPLATE_ENV_KEY,
        TEST_COMMAND_TEMPLATE,
    );
    const managedCwd = managedDebugConfig.cwd;
    const workingDirectoryVariableContext = {
        workspaceFolderPath: managed.launchWorkspaceFolder.uri.fsPath,
        workspaceFolderName: managed.launchWorkspaceFolder.name,
        namedWorkspaceFolderPaths: buildNamedWorkspaceFolderPaths(),
    };

    if (testFramework === "pytest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const pytestSelection = resolvePytestTargetForPosition(target, activePosition);

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestSelection.testFunction,
            testTarget: pytestSelection.testTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            configuredCwd: managedCwd,
            envOverrides: managedRunEnvironment.processEnvOverrides,
            workingDirectoryVariableContext,
            contextOverrides: {
                testFunction: pytestSelection.testFunction,
                testTarget: pytestSelection.testTarget,
            },
        });
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
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            configuredCwd: managedCwd,
            envOverrides: managedRunEnvironment.processEnvOverrides,
            workingDirectoryVariableContext,
            contextOverrides: {
                testFunction: unittestSelection.unittestFilter ?? unittestSelection.testFunction,
                testTarget: unittestSelection.testTarget,
            },
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, scriptCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
        configuredCwd: managedCwd,
        envOverrides: managedRunEnvironment.processEnvOverrides,
        workingDirectoryVariableContext,
    });
}
