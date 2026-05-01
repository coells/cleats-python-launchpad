import { URL, fileURLToPath } from "node:url";
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

const RUN_WITH_SUMMARY_RUNTIME_PATH = fileURLToPath(new URL("./runWithSummaryRuntime.js", import.meta.url));

function buildNodeRuntimeEnvironment(): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === "string") {
            env[key] = value;
        }
    }

    env.ELECTRON_RUN_AS_NODE = "1";
    return env;
}

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
    const execution = new vscode.ProcessExecution(
        process.execPath,
        [RUN_WITH_SUMMARY_RUNTIME_PATH, target.fileBasename, commandLine],
        {
            cwd: target.fileDirname,
            env: buildNodeRuntimeEnvironment(),
        },
    );
    const task = new vscode.Task(
        {
            type: EXTENSION_NAMESPACE,
            target: target.filePath,
            ...(openNewTerminal ? { invocation: Date.now().toString() } : {}),
        },
        target.workspaceFolder,
        taskName,
        TASK_SOURCE_LABEL,
        execution,
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
