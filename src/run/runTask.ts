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
import { resolveRunWorkingDirectory } from "./workingDirectory.js";

const RUN_WITH_SUMMARY_RUNTIME_PATH = fileURLToPath(new URL("./runWithSummaryRuntime.js", import.meta.url));
const activeCleatsRunTargets = new Map<string, number>();
let didRegisterRunTaskProcessListeners = false;

function buildNodeRuntimeEnvironment(envOverrides: Record<string, string | null> = {}): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (typeof value === "string") {
            env[key] = value;
        }
    }

    for (const [key, value] of Object.entries(envOverrides)) {
        if (value === null) {
            delete env[key];
            continue;
        }

        env[key] = value;
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

function getCleatsRunTargetPath(task: vscode.Task): string | undefined {
    if (task.source !== TASK_SOURCE_LABEL) {
        return undefined;
    }

    const definition = task.definition as Record<string, unknown>;
    if (definition.type !== EXTENSION_NAMESPACE || typeof definition.target !== "string") {
        return undefined;
    }

    return definition.target;
}

function adjustActiveTargetCount(targetPath: string, delta: number): void {
    const nextCount = (activeCleatsRunTargets.get(targetPath) ?? 0) + delta;
    if (nextCount <= 0) {
        activeCleatsRunTargets.delete(targetPath);
        return;
    }

    activeCleatsRunTargets.set(targetPath, nextCount);
}

function ensureRunTaskProcessTracking(): void {
    if (didRegisterRunTaskProcessListeners) {
        return;
    }

    vscode.tasks.onDidStartTaskProcess((event) => {
        const targetPath = getCleatsRunTargetPath(event.execution.task);
        if (!targetPath) {
            return;
        }

        adjustActiveTargetCount(targetPath, 1);
    });

    vscode.tasks.onDidEndTaskProcess((event) => {
        const targetPath = getCleatsRunTargetPath(event.execution.task);
        if (!targetPath) {
            return;
        }

        adjustActiveTargetCount(targetPath, -1);
    });

    didRegisterRunTaskProcessListeners = true;
}

function hasActiveCleatsRunTask(targetPath: string): boolean {
    ensureRunTaskProcessTracking();

    if ((activeCleatsRunTargets.get(targetPath) ?? 0) > 0) {
        return true;
    }

    // Fallback: covers already-running tasks started before listeners were registered.
    return vscode.tasks.taskExecutions.some((execution) => getCleatsRunTargetPath(execution.task) === targetPath);
}

export async function runPythonTarget(
    target: ResolvedPythonTarget,
    commandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    runOpenNewTerminalIfBusy: boolean,
    options: {
        configuredCwd?: unknown;
        contextOverrides?: CommandTemplateContextOverrides;
        envOverrides?: Record<string, string | null>;
    } = {},
): Promise<void> {
    const contextOverrides = options.contextOverrides ?? {};
    const resolvedCwd = resolveRunWorkingDirectory(target, options.configuredCwd);
    const openNewTerminal = runOpenNewTerminalIfBusy && hasActiveCleatsRunTask(target.filePath);
    const taskName = openNewTerminal ? `Run ${target.fileBasename} (${Date.now()})` : `Run ${target.fileBasename}`;
    const commandLine = expandCommandTemplate(commandTemplate, buildCommandTemplateContext(target, contextOverrides));
    const execution = new vscode.ProcessExecution(
        process.execPath,
        [RUN_WITH_SUMMARY_RUNTIME_PATH, target.fileBasename, commandLine],
        {
            cwd: resolvedCwd,
            env: buildNodeRuntimeEnvironment(options.envOverrides),
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
