import type * as vscode from "vscode";

export const EXTENSION_NAMESPACE = "cleatsPythonLaunchpad";
export const MANAGED_BY = "cleats-python-launchpad";
export const LAST_TARGET_KEY = "lastPythonTarget";
export const TASK_SOURCE_LABEL = "Cleats: Python Launchpad";

export type TerminalRevealSetting = "always" | "silent" | "never";
export type PythonTestFramework = "pytest" | "unittest";

export interface LastTargetRecord {
    filePath: string;
    workspaceFolderPath: string;
    testFramework?: PythonTestFramework;
    testFunction?: string;
    testTarget?: string;
}

export interface ResolvedPythonTarget {
    document: vscode.TextDocument;
    fileUri: vscode.Uri;
    filePath: string;
    fileBasename: string;
    fileDirname: string;
    workspaceFolder: vscode.WorkspaceFolder;
}

export type ManagedLaunchConfig = vscode.DebugConfiguration;
