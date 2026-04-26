import * as vscode from "vscode";

import type { ResolvedPythonTarget } from "./types.js";

function isPythonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === "python" || document.uri.fsPath.endsWith(".py");
}

export async function resolveActivePythonTarget(): Promise<ResolvedPythonTarget | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        await vscode.window.showWarningMessage("Open a saved Python file to use Cleats: Python Launchpad.");
        return undefined;
    }

    const { document } = editor;
    if (document.isUntitled) {
        await vscode.window.showWarningMessage("Save the current Python file before running or debugging it.");
        return undefined;
    }

    if (!isPythonDocument(document)) {
        await vscode.window.showWarningMessage("Cleats: Python Launchpad only works with saved Python files.");
        return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
        await vscode.window.showWarningMessage("The current Python file must be inside an open workspace folder.");
        return undefined;
    }

    const filePath = document.uri.fsPath;
    return {
        document,
        fileUri: document.uri,
        filePath,
        fileBasename: vscode.Uri.file(filePath).path.split("/").pop() ?? filePath,
        fileDirname: vscode.Uri.joinPath(document.uri, "..").fsPath,
        workspaceFolder,
    };
}

export async function resolveStoredPythonTarget(
    fileUri: vscode.Uri,
    workspaceFolderPath: string,
): Promise<ResolvedPythonTarget | undefined> {
    let stat: vscode.FileStat;
    try {
        stat = await vscode.workspace.fs.stat(fileUri);
    } catch {
        stat = undefined as never;
    }

    if (!stat || stat.type !== vscode.FileType.File) {
        return undefined;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
        (candidate) => candidate.uri.fsPath === workspaceFolderPath,
    );
    if (!workspaceFolder) {
        return undefined;
    }

    const document = await vscode.workspace.openTextDocument(fileUri);
    if (!isPythonDocument(document)) {
        return undefined;
    }

    const filePath = fileUri.fsPath;
    return {
        document,
        fileUri,
        filePath,
        fileBasename: vscode.Uri.file(filePath).path.split("/").pop() ?? filePath,
        fileDirname: vscode.Uri.joinPath(fileUri, "..").fsPath,
        workspaceFolder,
    };
}
