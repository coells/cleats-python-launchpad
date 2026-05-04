import * as vscode from "vscode";

import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { resolveStoredPythonTarget } from "../resolvePythonTarget.js";
import {
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    resolveCommandTemplateFromEnv,
} from "../run/commandTemplate.js";
import { resolveManagedRunEnvironment } from "../run/managedRunEnvironment.js";
import { runPythonTarget } from "../run/runTask.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { TerminalRevealSetting } from "../types.js";

export async function runLastFile(
    lastTargetStore: LastTargetStore,
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

    if (testFramework === "pytest") {
        const pytestTarget = lastTarget.testTarget ?? target.filePath;
        const pytestFunction = lastTarget.testFunction ?? "";

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestFunction,
            testTarget: pytestTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            configuredCwd: managedCwd,
            envOverrides: managedRunEnvironment.processEnvOverrides,
            contextOverrides: {
                testFunction: pytestFunction,
                testTarget: pytestTarget,
            },
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
            configuredCwd: managedCwd,
            envOverrides: managedRunEnvironment.processEnvOverrides,
            contextOverrides: {
                testFunction: unittestFunction,
                testTarget: unittestTarget,
            },
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, scriptCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
        configuredCwd: managedCwd,
        envOverrides: managedRunEnvironment.processEnvOverrides,
    });
}
