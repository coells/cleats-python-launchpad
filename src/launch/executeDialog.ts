import * as vscode from "vscode";

import {
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    type CommandTemplateEnvKey,
} from "../run/commandTemplate.js";
import type { ResolvedPythonTarget } from "../types.js";

export interface ExecuteDialogSettings {
    generatedLaunchNamePrefix: string;
    launchJsonPath: string;
    managedTargetConfigurationLimit: number;
    launchConfigurationTemplate: Record<string, unknown>;
    runCommandTemplate: string;
    testCommandTemplate: string;
}

interface QuickPickOption extends vscode.QuickPickItem {
    value: string;
}

function getWorkspaceFolderVariable(workspaceFolder: vscode.WorkspaceFolder): string {
    const workspaceFolderName = workspaceFolder.name.trim();
    if (workspaceFolderName.length === 0) {
        return "${workspaceFolder}";
    }

    return `\${workspaceFolder:${workspaceFolderName}}`;
}

function normalizeWorkspaceCwdVariable(target: ResolvedPythonTarget, configuredCwd: string): string {
    const trimmed = configuredCwd.trim();
    const targetWorkspaceFolderPath = target.workspaceFolder.uri.fsPath;
    if (trimmed === targetWorkspaceFolderPath) {
        return getWorkspaceFolderVariable(target.workspaceFolder);
    }

    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
        if (workspaceFolder.uri.fsPath === trimmed) {
            return getWorkspaceFolderVariable(workspaceFolder);
        }
    }

    return trimmed;
}

function cloneTemplate(template: Record<string, unknown>): Record<string, unknown> {
    return { ...template };
}

async function promptForCommandTemplate(preset: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
        title: "Cleats: Customize Execution",
        prompt: "Run command template",
        value: preset,
        validateInput: (input) => (input.trim().length > 0 ? undefined : "Run command cannot be empty."),
    });
    return value?.trim();
}

async function promptForCurrentWorkingDirectory(defaultCwd: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({
        title: "Cleats: Customize Execution",
        prompt: "Current working directory",
        value: defaultCwd,
        validateInput: (input) => (input.trim().length > 0 ? undefined : "Current working directory cannot be empty."),
    });
    return value?.trim();
}

async function promptForLaunchJsonPath(
    target: ResolvedPythonTarget,
    currentLaunchJsonPath: string,
): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    if (workspaceFolders.length <= 1) {
        return currentLaunchJsonPath;
    }

    const options: QuickPickOption[] = [
        {
            label: "Use current setting",
            description: currentLaunchJsonPath.trim().length > 0 ? currentLaunchJsonPath : target.workspaceFolder.name,
            value: "__keep__",
        },
        ...workspaceFolders.map((workspaceFolder) => ({
            label: workspaceFolder.name,
            description: workspaceFolder.uri.fsPath,
            value: workspaceFolder.uri.fsPath,
        })),
    ];

    const selection = await vscode.window.showQuickPick(options, {
        title: "Cleats: Customize Execution",
        placeHolder: "Select launch.json target workspace folder",
    });
    if (!selection) {
        return undefined;
    }

    return selection.value === "__keep__" ? currentLaunchJsonPath : selection.value;
}

function resolveTemplateDefaultCwd(target: ResolvedPythonTarget, template: Record<string, unknown>): string {
    const configuredCwd = template.cwd;
    if (typeof configuredCwd === "string" && configuredCwd.trim().length > 0) {
        return normalizeWorkspaceCwdVariable(target, configuredCwd);
    }

    return getWorkspaceFolderVariable(target.workspaceFolder);
}

function applyExecutionTemplateOverrides(
    existingTemplate: Record<string, unknown>,
    cwd: string,
    commandTemplate: string,
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
): Record<string, unknown> {
    const nextTemplate = cloneTemplate(existingTemplate);
    nextTemplate.cwd = cwd;

    const env =
        nextTemplate.env && typeof nextTemplate.env === "object" && !Array.isArray(nextTemplate.env)
            ? { ...(nextTemplate.env as Record<string, unknown>) }
            : {};
    delete env[RUN_COMMAND_TEMPLATE_ENV_KEY];
    delete env[TEST_COMMAND_TEMPLATE_ENV_KEY];
    env[commandTemplateEnvKeyToCopy] = commandTemplate;
    nextTemplate.env = env;

    return nextTemplate;
}

export async function resolveExecuteDialogSettings(
    target: ResolvedPythonTarget,
    initialSettings: ExecuteDialogSettings,
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
): Promise<ExecuteDialogSettings | undefined> {
    const presetCommandTemplate =
        commandTemplateEnvKeyToCopy === TEST_COMMAND_TEMPLATE_ENV_KEY
            ? initialSettings.testCommandTemplate
            : initialSettings.runCommandTemplate;
    const commandTemplate = await promptForCommandTemplate(presetCommandTemplate);
    if (!commandTemplate) {
        return undefined;
    }

    const cwd = await promptForCurrentWorkingDirectory(
        resolveTemplateDefaultCwd(target, initialSettings.launchConfigurationTemplate),
    );
    if (!cwd) {
        return undefined;
    }

    const launchJsonPath = await promptForLaunchJsonPath(target, initialSettings.launchJsonPath);
    if (launchJsonPath === undefined) {
        return undefined;
    }

    return {
        ...initialSettings,
        launchJsonPath,
        launchConfigurationTemplate: applyExecutionTemplateOverrides(
            initialSettings.launchConfigurationTemplate,
            cwd,
            commandTemplate,
            commandTemplateEnvKeyToCopy,
        ),
    };
}
