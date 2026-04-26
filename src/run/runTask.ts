import * as vscode from "vscode";

import {
    EXTENSION_NAMESPACE,
    type ResolvedPythonTarget,
    TASK_SOURCE_LABEL,
    type TerminalRevealSetting,
} from "../types.js";
import {
    type CommandTemplateContextOverrides,
    buildCommandTemplateContext,
    expandCommandTemplate,
} from "./commandTemplate.js";

function mapReveal(value: TerminalRevealSetting): vscode.TaskRevealKind {
    switch (value) {
        case "never":
            return vscode.TaskRevealKind.Never;
        case "silent":
            return vscode.TaskRevealKind.Silent;
        case "always":
        default:
            return vscode.TaskRevealKind.Always;
    }
}

function hasActiveCleatsRunTask(targetPath: string): boolean {
    return vscode.tasks.taskExecutions.some((execution) => {
        if (execution.task.source !== TASK_SOURCE_LABEL) {
            return false;
        }

        const definition = execution.task.definition as Record<string, unknown>;
        return definition.type === EXTENSION_NAMESPACE && definition.target === targetPath;
    });
}

export async function runPythonTarget(
    target: ResolvedPythonTarget,
    commandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    runOpenNewTerminalIfBusy: boolean,
    contextOverrides: CommandTemplateContextOverrides = {},
): Promise<void> {
    const openNewTerminal = runOpenNewTerminalIfBusy && hasActiveCleatsRunTask(target.filePath);
    const taskName = openNewTerminal ? `Run ${target.fileBasename} (${Date.now()})` : `Run ${target.fileBasename}`;
    const commandLine = expandCommandTemplate(commandTemplate, buildCommandTemplateContext(target, contextOverrides));
    const task = new vscode.Task(
        {
            type: EXTENSION_NAMESPACE,
            target: target.filePath,
            ...(openNewTerminal ? { invocation: Date.now().toString() } : {}),
        },
        target.workspaceFolder,
        taskName,
        TASK_SOURCE_LABEL,
        new vscode.ShellExecution(commandLine, {
            cwd: target.fileDirname,
        }),
    );

    task.presentationOptions = {
        clear: false,
        echo: true,
        focus: false,
        panel: openNewTerminal ? vscode.TaskPanelKind.New : vscode.TaskPanelKind.Dedicated,
        reveal: mapReveal(terminalReveal),
        showReuseMessage: false,
    };
    task.runOptions = {
        reevaluateOnRerun: false,
    };

    await vscode.tasks.executeTask(task);
}
