import * as vscode from "vscode";

import type { ManagedLaunchConfig, ResolvedPythonTarget } from "../types.js";
import { resolveLaunchWorkspaceFolder } from "./launchWorkspaceFolder.js";
import {
    getManagedLaunchName,
    removeManagedTargetLaunchConfigs,
    upsertManagedLaunchConfig,
} from "./managedLaunchConfigModel.js";

export interface EnsuredManagedLaunchConfig {
    debugConfig: ManagedLaunchConfig;
    launchWorkspaceFolder: vscode.WorkspaceFolder;
    runCommandTemplate: string;
}

export interface RemovedManagedTargetLaunchConfigs {
    removedCount: number;
    updatedWorkspaceFolders: number;
}

function toDescriptor(target: ResolvedPythonTarget) {
    return {
        fileDirname: target.fileDirname,
        filePath: target.filePath,
        workspaceRelativePath: vscode.workspace.asRelativePath(target.fileUri, false),
    };
}

export async function ensureManagedLaunchConfig(
    target: ResolvedPythonTarget,
    prefix: string,
    defaultRunCommandTemplate: string,
    configuredLaunchWorkspaceFolder: string,
): Promise<EnsuredManagedLaunchConfig> {
    // In multi-root workspaces, managed launch entries can be pinned to a specific folder.
    const launchWorkspaceFolderResolution = resolveLaunchWorkspaceFolder(
        vscode.workspace.workspaceFolders,
        target.workspaceFolder,
        configuredLaunchWorkspaceFolder,
    );
    if (configuredLaunchWorkspaceFolder.trim() && !launchWorkspaceFolderResolution.didMatchConfiguredFolder) {
        await vscode.window.showWarningMessage(
            `Cleats: Python Launchpad could not find workspace folder "${configuredLaunchWorkspaceFolder}"; using ${target.workspaceFolder.name} for launch.json.`,
        );
    }

    const launchConfiguration = vscode.workspace.getConfiguration(
        "launch",
        launchWorkspaceFolderResolution.workspaceFolder.uri,
    );
    const existingConfigurations = launchConfiguration.get<readonly unknown[]>("configurations", []);
    const descriptor = toDescriptor(target);
    const result = upsertManagedLaunchConfig(existingConfigurations, descriptor, prefix, defaultRunCommandTemplate);

    await launchConfiguration.update(
        "configurations",
        result.configurations,
        vscode.ConfigurationTarget.WorkspaceFolder,
    );

    return {
        debugConfig: result.debugConfig,
        launchWorkspaceFolder: launchWorkspaceFolderResolution.workspaceFolder,
        runCommandTemplate: result.runCommandTemplate,
    };
}

export function getManagedLaunchNameForTarget(target: ResolvedPythonTarget, prefix: string): string {
    return getManagedLaunchName(toDescriptor(target), prefix);
}

export async function removeManagedTargetLaunchConfigsFromWorkspace(
    prefix: string,
): Promise<RemovedManagedTargetLaunchConfigs> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    let removedCount = 0;
    let updatedWorkspaceFolders = 0;

    for (const workspaceFolder of workspaceFolders) {
        const launchConfiguration = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
        const existingConfigurations = launchConfiguration.get<readonly unknown[]>("configurations", []);
        const next = removeManagedTargetLaunchConfigs(existingConfigurations, prefix);

        if (next.removedCount === 0) {
            continue;
        }

        await launchConfiguration.update(
            "configurations",
            next.configurations,
            vscode.ConfigurationTarget.WorkspaceFolder,
        );
        removedCount += next.removedCount;
        updatedWorkspaceFolders += 1;
    }

    return {
        removedCount,
        updatedWorkspaceFolders,
    };
}
