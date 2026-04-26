import * as vscode from "vscode";

import { removeManagedTargetLaunchConfigsFromWorkspace } from "../launch/managedLaunchConfigs.js";

export async function removeManagedTargetConfigurations(generatedLaunchNamePrefix: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (workspaceFolders.length === 0) {
        await vscode.window.showWarningMessage(
            "Open a workspace folder before removing managed launch configurations.",
        );
        return;
    }

    const result = await removeManagedTargetLaunchConfigsFromWorkspace(generatedLaunchNamePrefix);
    if (result.removedCount === 0) {
        await vscode.window.showInformationMessage("No managed target launch configurations were found.");
        return;
    }

    const configurationLabel = result.removedCount === 1 ? "configuration" : "configurations";
    const folderLabel = result.updatedWorkspaceFolders === 1 ? "folder" : "folders";
    await vscode.window.showInformationMessage(
        `Removed ${result.removedCount} managed target launch ${configurationLabel} from ${result.updatedWorkspaceFolders} workspace ${folderLabel}.`,
    );
}
