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
    testCommandTemplate: string,
    terminalReveal: TerminalRevealSetting,
    generatedLaunchNamePrefix: string,
    runOpenNewTerminalIfBusy: boolean,
    launchJsonPath: string,
    managedTargetConfigurationLimit: number,
): Promise<void> {
    const target = await resolveActivePythonTarget();
    if (!target) {
        return;
    }

    await ensureManagedLaunchConfig(target, generatedLaunchNamePrefix, launchJsonPath, managedTargetConfigurationLimit);

    const testFramework = isTestFile(target.fileBasename)
        ? (resolveConfiguredTestFramework(target) ?? "pytest")
        : undefined;
    if (testFramework === "pytest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const pytestSelection = resolvePytestTargetForPosition(target, activePosition);

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: pytestSelection.testFunction,
            testTarget: pytestSelection.testTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            testFunction: pytestSelection.testFunction,
            testTarget: pytestSelection.testTarget,
        });
        return;
    }

    if (testFramework === "unittest") {
        const activePosition = vscode.window.activeTextEditor?.selection.active;
        const unittestSelection = resolveUnittestTargetForPosition(target, activePosition);

        await lastTargetStore.set(target, {
            testFramework,
            testFunction: unittestSelection.testFunction,
            testTarget: unittestSelection.testTarget,
        });
        await runPythonTarget(target, testCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy, {
            testFunction: unittestSelection.unittestFilter ?? unittestSelection.testFunction,
            testTarget: unittestSelection.testTarget,
        });
        return;
    }

    await lastTargetStore.set(target);
    await runPythonTarget(target, scriptCommandTemplate, terminalReveal, runOpenNewTerminalIfBusy);
}
