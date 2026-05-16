import * as vscode from "vscode";

import type { ExecuteDialogSettings } from "../launch/executeDialog.js";
import { ensureManagedLaunchConfig, type EnsuredManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { resolveStoredPythonTarget } from "../resolvePythonTarget.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { LastTargetRecord, ResolvedPythonTarget } from "../types.js";
import {
    MISSING_STORED_TARGET_WARNING_MESSAGE,
    resolveCommandTemplateEnvKey,
    resolveConfiguredFrameworkForTargetFile,
    resolveEffectiveTestFramework,
} from "./commandExecutionModel.js";
import { resolveSettingsForExecution } from "./executeDialogSettings.js";

export interface CommandExecutionSettings extends ExecuteDialogSettings {
    executeDialogEnabled: boolean;
}

export interface PreparedManagedCommandExecution {
    managed: EnsuredManagedLaunchConfig;
    testFramework: "pytest" | "unittest" | undefined;
}

export interface ResolvedLastCommandTarget {
    lastTarget: LastTargetRecord;
    target: ResolvedPythonTarget;
}

function resolveConfiguredFrameworkForTarget(target: ResolvedPythonTarget): "pytest" | "unittest" | undefined {
    return resolveConfiguredFrameworkForTargetFile(
        isTestFile(target.fileBasename),
        resolveConfiguredTestFramework(target),
    );
}

export async function prepareManagedCommandExecution(
    target: ResolvedPythonTarget,
    settings: CommandExecutionSettings,
    storedFramework?: "pytest" | "unittest",
): Promise<PreparedManagedCommandExecution | undefined> {
    const configuredFramework = resolveConfiguredFrameworkForTarget(target);
    const testFramework = resolveEffectiveTestFramework(configuredFramework, storedFramework);
    const commandTemplateEnvKeyToCopy = resolveCommandTemplateEnvKey(testFramework);
    const executionSettings = await resolveSettingsForExecution(
        target,
        {
            generatedLaunchNamePrefix: settings.generatedLaunchNamePrefix,
            launchJsonPath: settings.launchJsonPath,
            managedTargetConfigurationLimit: settings.managedTargetConfigurationLimit,
            launchConfigurationTemplate: settings.launchConfigurationTemplate,
            runCommandTemplate: settings.runCommandTemplate,
            testCommandTemplate: settings.testCommandTemplate,
        },
        commandTemplateEnvKeyToCopy,
        settings.executeDialogEnabled,
    );
    if (!executionSettings) {
        return undefined;
    }

    const managed = await ensureManagedLaunchConfig(
        target,
        executionSettings.generatedLaunchNamePrefix,
        executionSettings.launchJsonPath,
        commandTemplateEnvKeyToCopy,
        executionSettings.managedTargetConfigurationLimit,
        executionSettings.launchConfigurationTemplate,
    );

    return {
        managed,
        testFramework,
    };
}

export function buildNamedWorkspaceFolderPaths(): Record<string, string> {
    const namedFolders: Record<string, string> = {};
    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
        namedFolders[workspaceFolder.name] = workspaceFolder.uri.fsPath;
    }

    return namedFolders;
}

export async function resolveLastCommandTarget(
    lastTargetStore: LastTargetStore,
): Promise<ResolvedLastCommandTarget | undefined> {
    const lastTarget = lastTargetStore.get();
    if (!lastTarget) {
        return undefined;
    }

    const target = await resolveStoredPythonTarget(
        vscode.Uri.file(lastTarget.filePath),
        lastTarget.workspaceFolderPath,
    );
    if (!target) {
        await lastTargetStore.clear();
        await vscode.window.showWarningMessage(MISSING_STORED_TARGET_WARNING_MESSAGE);
        return undefined;
    }

    return {
        lastTarget,
        target,
    };
}
