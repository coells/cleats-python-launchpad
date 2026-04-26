import * as vscode from "vscode";

import { debugCurrentFile } from "./commands/debugCurrentFile.js";
import { debugLastFile } from "./commands/debugLastFile.js";
import { removeManagedTargetConfigurations } from "./commands/removeManagedTargetConfigurations.js";
import { runCurrentFile } from "./commands/runCurrentFile.js";
import { runLastFile } from "./commands/runLastFile.js";
import { LastTargetStore } from "./state/lastTargetStore.js";
import { EXTENSION_NAMESPACE, type TerminalRevealSetting } from "./types.js";

function getSettings() {
    const configuration = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
    return {
        generatedLaunchNamePrefix: configuration.get<string>("generatedLaunchNamePrefix", "Launchpad"),
        launchWorkspaceFolder: configuration.get<string>("launchWorkspaceFolder", ""),
        runCommandTemplate: configuration.get<string>("runCommandTemplate", "uv run python {script}"),
        pytestCommandTemplate: configuration.get<string>("pytestCommandTemplate", "uv run pytest {pytestTarget}"),
        unittestCommandTemplate: configuration.get<string>(
            "unittestCommandTemplate",
            "uv run python -m unittest {testTarget}",
        ),
        runOpenNewTerminalIfBusy: configuration.get<boolean>("runOpenNewTerminalIfBusy", true),
        terminalReveal: configuration.get<TerminalRevealSetting>("terminalReveal", "always"),
    };
}

export function activate(context: vscode.ExtensionContext): void {
    const lastTargetStore = new LastTargetStore(context.workspaceState);

    context.subscriptions.push(
        vscode.commands.registerCommand("cleatsPythonLaunchpad.runCurrentFile", async () => {
            const settings = getSettings();
            await runCurrentFile(
                lastTargetStore,
                settings.runCommandTemplate,
                settings.pytestCommandTemplate,
                settings.unittestCommandTemplate,
                settings.terminalReveal,
                settings.generatedLaunchNamePrefix,
                settings.runOpenNewTerminalIfBusy,
                settings.launchWorkspaceFolder,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.runLastFile", async () => {
            const settings = getSettings();
            await runLastFile(
                lastTargetStore,
                settings.runCommandTemplate,
                settings.pytestCommandTemplate,
                settings.unittestCommandTemplate,
                settings.terminalReveal,
                settings.generatedLaunchNamePrefix,
                settings.runOpenNewTerminalIfBusy,
                settings.launchWorkspaceFolder,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.debugCurrentFile", async () => {
            const settings = getSettings();
            await debugCurrentFile(
                lastTargetStore,
                settings.generatedLaunchNamePrefix,
                settings.runCommandTemplate,
                settings.launchWorkspaceFolder,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.debugLastFile", async () => {
            const settings = getSettings();
            await debugLastFile(
                lastTargetStore,
                settings.generatedLaunchNamePrefix,
                settings.runCommandTemplate,
                settings.launchWorkspaceFolder,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.removeManagedTargetConfigurations", async () => {
            const settings = getSettings();
            await removeManagedTargetConfigurations(settings.generatedLaunchNamePrefix);
        }),
    );
}

export function deactivate(): void {}
