import * as vscode from "vscode";

import { debugCurrentFile } from "./commands/debugCurrentFile.js";
import { debugLastFile } from "./commands/debugLastFile.js";
import { removeManagedTargetConfigurations } from "./commands/removeManagedTargetConfigurations.js";
import { runCurrentFile } from "./commands/runCurrentFile.js";
import { runLastFile } from "./commands/runLastFile.js";
import { LastTargetStore } from "./state/lastTargetStore.js";
import { EXTENSION_NAMESPACE, type TerminalRevealSetting } from "./types.js";

function toLaunchConfigOverrides(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return { ...(value as Record<string, unknown>) };
}

function resolveCommandTemplateSetting(
    configuration: vscode.WorkspaceConfiguration,
    key: string,
    fallback: string,
): string {
    const configured = configuration.get<string>(key, fallback);
    const trimmed = configured.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

function getSettings() {
    const configuration = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
    return {
        generatedLaunchNamePrefix: configuration.get<string>("generatedLaunchNamePrefix", "Launchpad"),
        runCommandTemplate: resolveCommandTemplateSetting(configuration, "runCommandTemplate", "python {script}"),
        testCommandTemplate: resolveCommandTemplateSetting(
            configuration,
            "testCommandTemplate",
            "python -m pytest {testTarget}",
        ),
        launchJsonPath: configuration.get<string>("launchJsonPath", ""),
        managedTargetConfigurationLimit: Math.max(
            1,
            Math.floor(configuration.get<number>("managedTargetConfigurationLimit", 20)),
        ),
        runOpenNewTerminalIfBusy: configuration.get<boolean>("runOpenNewTerminalIfBusy", true),
        debugOpenNewTerminalIfBusy: configuration.get<boolean>("debugOpenNewTerminalIfBusy", true),
        executeDialogEnabled: configuration.get<boolean>("executeDialogEnabled", true),
        terminalReveal: configuration.get<TerminalRevealSetting>("terminalReveal", "always"),
        launchConfigurationTemplate: toLaunchConfigOverrides(configuration.get("launchConfigurationTemplate", {})),
    };
}

export function activate(context: vscode.ExtensionContext): void {
    const lastTargetStore = new LastTargetStore(context.workspaceState);

    context.subscriptions.push(
        vscode.commands.registerCommand("cleatsPythonLaunchpad.runCurrentFile", async () => {
            const settings = getSettings();
            await runCurrentFile(
                lastTargetStore,
                settings.terminalReveal,
                settings.generatedLaunchNamePrefix,
                settings.runOpenNewTerminalIfBusy,
                settings.runCommandTemplate,
                settings.testCommandTemplate,
                settings.launchJsonPath,
                settings.managedTargetConfigurationLimit,
                settings.launchConfigurationTemplate,
                settings.executeDialogEnabled,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.runLastFile", async () => {
            const settings = getSettings();
            await runLastFile(
                lastTargetStore,
                settings.terminalReveal,
                settings.generatedLaunchNamePrefix,
                settings.runOpenNewTerminalIfBusy,
                settings.runCommandTemplate,
                settings.testCommandTemplate,
                settings.launchJsonPath,
                settings.managedTargetConfigurationLimit,
                settings.launchConfigurationTemplate,
                settings.executeDialogEnabled,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.debugCurrentFile", async () => {
            const settings = getSettings();
            await debugCurrentFile(
                lastTargetStore,
                settings.generatedLaunchNamePrefix,
                settings.runCommandTemplate,
                settings.testCommandTemplate,
                settings.launchJsonPath,
                settings.managedTargetConfigurationLimit,
                settings.debugOpenNewTerminalIfBusy,
                settings.launchConfigurationTemplate,
                settings.executeDialogEnabled,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.debugLastFile", async () => {
            const settings = getSettings();
            await debugLastFile(
                lastTargetStore,
                settings.generatedLaunchNamePrefix,
                settings.runCommandTemplate,
                settings.testCommandTemplate,
                settings.launchJsonPath,
                settings.managedTargetConfigurationLimit,
                settings.debugOpenNewTerminalIfBusy,
                settings.launchConfigurationTemplate,
                settings.executeDialogEnabled,
            );
        }),
        vscode.commands.registerCommand("cleatsPythonLaunchpad.removeManagedTargetConfigurations", async () => {
            const settings = getSettings();
            await removeManagedTargetConfigurations(settings.generatedLaunchNamePrefix);
        }),
    );
}

export function deactivate(): void {}
