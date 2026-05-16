import {
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    resolveCommandTemplateFromEnv,
} from "../run/commandTemplate.js";
import { resolveManagedRunEnvironment } from "../run/managedRunEnvironment.js";
import { runPythonTarget } from "../run/runTask.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { TerminalRevealSetting } from "../types.js";
import {
    buildNamedWorkspaceFolderPaths,
    prepareManagedCommandExecution,
    resolveLastCommandTarget,
} from "./commandExecution.js";

export async function runLastFile(
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
    const resolvedLastTarget = await resolveLastCommandTarget(lastTargetStore);
    if (!resolvedLastTarget) {
        return;
    }

    const { lastTarget, target } = resolvedLastTarget;

    const preparedExecution = await prepareManagedCommandExecution(
        target,
        {
            generatedLaunchNamePrefix,
            launchJsonPath,
            managedTargetConfigurationLimit,
            launchConfigurationTemplate,
            runCommandTemplate: configuredRunCommandTemplate,
            testCommandTemplate: configuredTestCommandTemplate,
            executeDialogEnabled,
        },
        lastTarget.testFramework,
    );
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
            workingDirectoryVariableContext,
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
            workingDirectoryVariableContext,
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
        workingDirectoryVariableContext,
    });
}
