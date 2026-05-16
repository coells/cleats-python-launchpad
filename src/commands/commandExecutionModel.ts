import {
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    type CommandTemplateEnvKey,
} from "../run/commandTemplate.js";
import type { PythonTestFramework } from "../types.js";

export const MISSING_STORED_TARGET_WARNING_MESSAGE =
    "The previous Python target is no longer available. Open a Python file and run it again.";

export function resolveConfiguredFrameworkForTargetFile(
    isTestTarget: boolean,
    configuredFramework: PythonTestFramework | undefined,
): PythonTestFramework | undefined {
    if (!isTestTarget) {
        return undefined;
    }

    return configuredFramework ?? "pytest";
}

export function resolveEffectiveTestFramework(
    configuredFramework: PythonTestFramework | undefined,
    storedFramework: PythonTestFramework | undefined,
): PythonTestFramework | undefined {
    return storedFramework ?? configuredFramework;
}

export function resolveCommandTemplateEnvKey(testFramework: PythonTestFramework | undefined): CommandTemplateEnvKey {
    return testFramework ? TEST_COMMAND_TEMPLATE_ENV_KEY : RUN_COMMAND_TEMPLATE_ENV_KEY;
}

export function resolveLastUnittestFilter(
    unittestFunction: string,
    unittestTarget: string,
    filePath: string,
): string | undefined {
    return unittestFunction.length > 0 && unittestTarget === filePath ? unittestFunction : undefined;
}

export function formatDebugStartFailureMessage(
    fileBasename: string,
    testFramework: PythonTestFramework | undefined,
): string {
    if (testFramework === "pytest") {
        return `Failed to start pytest debugging for ${fileBasename}.`;
    }

    if (testFramework === "unittest") {
        return `Failed to start unittest debugging for ${fileBasename}.`;
    }

    return `Failed to start debugging for ${fileBasename}.`;
}
