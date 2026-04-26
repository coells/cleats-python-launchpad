import * as vscode from "vscode";

import { ensureManagedLaunchConfig } from "../launch/managedLaunchConfigs.js";
import { resolveActivePythonTarget } from "../resolvePythonTarget.js";
import { resolvePytestTargetForPosition } from "../run/pytestTarget.js";
import { runPythonTarget } from "../run/runTask.js";
import { isTestFile, resolveConfiguredTestFramework } from "../run/testFramework.js";
import { resolveUnittestTargetForPosition } from "../run/unittestTarget.js";
import type { LastTargetStore } from "../state/lastTargetStore.js";
import type { TerminalRevealSetting } from "../types.js";

export async function runCurrentFile(
    lastTargetStore: LastTargetStore,
    scriptCommandTemplate: string,
    pytestCommandTemplate: string,
    unittestCommandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    generatedLaunchNamePrefix: string,
    runOpenNewTerminalIfBusy: boolean,
    launchWorkspaceFolder: string,
): Promise<void> {
    const target = await resolveActivePythonTarget();
    if (!target) {
        return;
    }

    const managed = await ensureManagedLaunchConfig(
        target,
        generatedLaunchNamePrefix,
        scriptCommandTemplate,
        launchWorkspaceFolder,
    );

    const testFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    if (testFramework === "pytest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const pytestSelection = resolvePytestTargetForPosition(target, activePosition);

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestSelection.pytestFunction,
            testTarget: pytestSelection.pytestTarget,
        });
        await runPythonTarget(target, pytestCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, pytestSelection);
        return;
    }

    if (testFramework === "unittest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const unittestSelection = resolveUnittestTargetForPosition(target, activePosition);
        const unittestTemplate = unittestSelection.unittestFilter
            ? `${unittestCommandTemplate} -k {testFunction}`
            : unittestCommandTemplate;

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestSelection.pytestFunction,
            testTarget: unittestSelection.pytestTarget,
        });
        await runPythonTarget(target, unittestTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            pytestFunction: unittestSelection.pytestFunction,
            pytestTarget: unittestSelection.pytestTarget,
            testFunction: unittestSelection.unittestFilter ?? unittestSelection.pytestFunction,
            testTarget: unittestSelection.pytestTarget,
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, managed.runCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy);
}
