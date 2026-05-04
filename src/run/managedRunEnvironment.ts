import { Buffer } from "node:buffer";
import * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";
import {
    mergeManagedRunEnvironment,
    parseEnvFile,
    resolveConfiguredEnvFilePath,
    type ResolvedManagedRunEnvironment,
} from "./managedRunEnvironmentModel.js";

async function loadEnvFromFile(envFilePath: string | undefined): Promise<Record<string, string>> {
    if (!envFilePath) {
        return {};
    }

    try {
        const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(envFilePath));
        const decoded = Buffer.from(fileContents).toString("utf-8");
        return parseEnvFile(decoded);
    } catch {
        return {};
    }
}

export async function resolveManagedRunEnvironment(
    target: ResolvedPythonTarget,
    launchWorkspaceFolder: vscode.WorkspaceFolder,
    debugConfig: Record<string, unknown>,
): Promise<ResolvedManagedRunEnvironment> {
    const envFilePath = resolveConfiguredEnvFilePath(debugConfig.envFile, {
        target,
        workspaceFolderPath: launchWorkspaceFolder.uri.fsPath,
        workspaceFolderName: launchWorkspaceFolder.name,
    });
    const envFromFile = await loadEnvFromFile(envFilePath);
    return mergeManagedRunEnvironment(envFromFile, debugConfig.env);
}

export { type ResolvedManagedRunEnvironment } from "./managedRunEnvironmentModel.js";
