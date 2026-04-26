import * as path from "node:path";

import type * as vscode from "vscode";

export interface LaunchWorkspaceFolderResolution {
    didMatchConfiguredFolder: boolean;
    workspaceFolder: vscode.WorkspaceFolder;
}

function normalizePath(value: string): string {
    const normalized = path.normalize(value).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function resolveLaunchWorkspaceFolder(
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
    defaultWorkspaceFolder: vscode.WorkspaceFolder,
    configuredWorkspaceFolder: string | undefined,
): LaunchWorkspaceFolderResolution {
    // Empty setting means "use the target file's workspace folder".
    const configured = configuredWorkspaceFolder?.trim();
    if (!configured) {
        return {
            didMatchConfiguredFolder: true,
            workspaceFolder: defaultWorkspaceFolder,
        };
    }

    const folders = workspaceFolders ?? [];
    const byName = folders.find((candidate) => candidate.name === configured);
    if (byName) {
        return {
            didMatchConfiguredFolder: true,
            workspaceFolder: byName,
        };
    }

    // Absolute paths are allowed to avoid ambiguity when folder names repeat.
    if (path.isAbsolute(configured)) {
        const normalizedConfiguredPath = normalizePath(configured);
        const byPath = folders.find((candidate) => normalizePath(candidate.uri.fsPath) === normalizedConfiguredPath);
        if (byPath) {
            return {
                didMatchConfiguredFolder: true,
                workspaceFolder: byPath,
            };
        }
    }

    return {
        didMatchConfiguredFolder: false,
        workspaceFolder: defaultWorkspaceFolder,
    };
}
