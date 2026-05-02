import * as vscode from "vscode";

import type { ResolvedPythonTarget } from "../types.js";

const DEBUG_STARTUP_GRACE_MS = 8_000;
const pendingDebugStartsByTargetPath = new Map<string, number>();
const trackedDebugSessionConfigs = new Map<string, Record<string, unknown>>();
let isDebugSessionTrackingInitialized = false;

function ensureDebugSessionTracking(): void {
    if (isDebugSessionTrackingInitialized) {
        return;
    }

    isDebugSessionTrackingInitialized = true;
    void vscode.debug.onDidStartDebugSession((session) => {
        trackedDebugSessionConfigs.set(session.id, session.configuration as Record<string, unknown>);
    });
    void vscode.debug.onDidTerminateDebugSession((session) => {
        trackedDebugSessionConfigs.delete(session.id);
    });
}

function markDebugTargetStarting(target: ResolvedPythonTarget): void {
    pendingDebugStartsByTargetPath.set(target.filePath, Date.now());
}

function clearDebugTargetStarting(target: ResolvedPythonTarget): void {
    pendingDebugStartsByTargetPath.delete(target.filePath);
}

function isDebugTargetStartPending(target: ResolvedPythonTarget): boolean {
    const startedAt = pendingDebugStartsByTargetPath.get(target.filePath);
    if (startedAt === undefined) {
        return false;
    }

    if (Date.now() - startedAt > DEBUG_STARTUP_GRACE_MS) {
        pendingDebugStartsByTargetPath.delete(target.filePath);
        return false;
    }

    return true;
}

function hasTargetPathArgument(args: readonly unknown[], targetPath: string): boolean {
    return args.some(
        (value) => typeof value === "string" && (value === targetPath || value.startsWith(`${targetPath}::`)),
    );
}

function isDebugConfigurationForTarget(configuration: Record<string, unknown>, target: ResolvedPythonTarget): boolean {
    const program = typeof configuration.program === "string" ? configuration.program : undefined;
    if (program === target.filePath) {
        return true;
    }

    const args = Array.isArray(configuration.args) ? configuration.args : [];
    if (hasTargetPathArgument(args, target.filePath)) {
        return true;
    }

    const name = typeof configuration.name === "string" ? configuration.name : "";
    return name.includes(target.fileBasename);
}

export function isDebugTargetBusy(target: ResolvedPythonTarget): boolean {
    ensureDebugSessionTracking();

    const hasMatchingSession = Array.from(trackedDebugSessionConfigs.values()).some((configuration) =>
        isDebugConfigurationForTarget(configuration, target),
    );
    if (hasMatchingSession) {
        clearDebugTargetStarting(target);
        return true;
    }

    const activeSession = vscode.debug.activeDebugSession;
    if (activeSession) {
        const configuration = activeSession.configuration as Record<string, unknown>;
        if (isDebugConfigurationForTarget(configuration, target)) {
            clearDebugTargetStarting(target);
            return true;
        }
    }

    return isDebugTargetStartPending(target);
}

export function shouldOpenNewDebugTerminalIfBusy(
    target: ResolvedPythonTarget,
    debugOpenNewTerminalIfBusy: boolean,
): boolean {
    return debugOpenNewTerminalIfBusy && isDebugTargetBusy(target);
}

export function withDebugInvocationSuffix(
    debugConfig: vscode.DebugConfiguration,
    openNewTerminal: boolean,
): vscode.DebugConfiguration {
    if (!openNewTerminal) {
        return debugConfig;
    }

    const baseName = typeof debugConfig.name === "string" ? debugConfig.name : "Debug";
    return {
        ...debugConfig,
        name: `${baseName} (${Date.now()})`,
    };
}

export async function startDebuggingWithBusyTracking(
    target: ResolvedPythonTarget,
    launchWorkspaceFolder: vscode.WorkspaceFolder | undefined,
    debugConfig: vscode.DebugConfiguration,
): Promise<boolean> {
    markDebugTargetStarting(target);
    try {
        const started = await vscode.debug.startDebugging(launchWorkspaceFolder, debugConfig);
        if (!started) {
            clearDebugTargetStarting(target);
        }

        return started;
    } catch (error) {
        clearDebugTargetStarting(target);
        throw error;
    }
}
