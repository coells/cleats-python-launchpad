import * as path from "node:path";

import type * as vscode from "vscode";

export interface LaunchWorkspaceFolderResolution {
    didMatchConfiguredLaunchJsonPath: boolean;
    workspaceFolder: vscode.WorkspaceFolder;
}

const LAUNCH_JSON_BASENAME = "launch.json";
const RELATIVE_LAUNCH_JSON_PATH = path.join(".vscode", LAUNCH_JSON_BASENAME);

function normalizePath(value: string): string {
    const normalized = path.normalize(value).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function toFileSystemPath(value: string): string {
    return normalizePath(value.trim());
}

function toLaunchJsonPath(configuredLaunchJsonPath: string): string {
    const configuredPath = toFileSystemPath(configuredLaunchJsonPath);
    if (!path.isAbsolute(configuredPath)) {
        return configuredPath;
    }

    if (path.basename(configuredPath) === LAUNCH_JSON_BASENAME) {
        return normalizePath(configuredPath);
    }

    // If a folder path is provided, map it to .vscode/launch.json.
    return normalizePath(path.join(configuredPath, RELATIVE_LAUNCH_JSON_PATH));
}

function getWorkspaceLaunchJsonPath(workspaceFolder: vscode.WorkspaceFolder): string {
    return normalizePath(path.join(workspaceFolder.uri.fsPath, RELATIVE_LAUNCH_JSON_PATH));
}

export function resolveLaunchWorkspaceFolder(
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
    defaultWorkspaceFolder: vscode.WorkspaceFolder,
    configuredLaunchJsonPath: string | undefined,
): LaunchWorkspaceFolderResolution {
    // Empty setting means "use the target file's workspace folder launch.json".
    const configured = configuredLaunchJsonPath?.trim();
    if (!configured) {
        return {
            didMatchConfiguredLaunchJsonPath: true,
            workspaceFolder: defaultWorkspaceFolder,
        };
    }

    const folders = workspaceFolders ?? [];
    const normalizedLaunchJsonPath = toLaunchJsonPath(configured);
    const byLaunchJsonPath = folders.find(
        (candidate) => getWorkspaceLaunchJsonPath(candidate) === normalizedLaunchJsonPath,
    );
    if (byLaunchJsonPath) {
        return {
            didMatchConfiguredLaunchJsonPath: true,
            workspaceFolder: byLaunchJsonPath,
        };
    }

    return {
        didMatchConfiguredLaunchJsonPath: false,
        workspaceFolder: defaultWorkspaceFolder,
    };
}
