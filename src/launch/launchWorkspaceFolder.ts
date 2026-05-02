import * as path from "node:path";
import { fileURLToPath } from "node:url";

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
    const trimmed = value.trim();
    if (trimmed.startsWith("file://")) {
        try {
            return normalizePath(fileURLToPath(trimmed));
        } catch {
            return normalizePath(trimmed);
        }
    }

    return normalizePath(trimmed);
}

function toLaunchJsonPath(configuredLaunchJsonPath: string, defaultWorkspaceFolder: vscode.WorkspaceFolder): string {
    const configuredPath = toFileSystemPath(configuredLaunchJsonPath);
    const resolvedPath = path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(defaultWorkspaceFolder.uri.fsPath, configuredPath);

    if (path.basename(resolvedPath) === LAUNCH_JSON_BASENAME) {
        return normalizePath(resolvedPath);
    }

    // Backward-compatible: if a folder path is provided, map it to .vscode/launch.json.
    return normalizePath(path.join(resolvedPath, RELATIVE_LAUNCH_JSON_PATH));
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
    const normalizedLaunchJsonPath = toLaunchJsonPath(configured, defaultWorkspaceFolder);
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
