import { resolveExecuteDialogSettings, type ExecuteDialogSettings } from "../launch/executeDialog.js";
import { getManagedTargetPresence } from "../launch/managedLaunchConfigs.js";
import {
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
    type CommandTemplateEnvKey,
} from "../run/commandTemplate.js";
import type { ResolvedPythonTarget } from "../types.js";

function withConfiguredCommandTemplate(
    settings: ExecuteDialogSettings,
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
): ExecuteDialogSettings {
    const nextTemplate = { ...settings.launchConfigurationTemplate };
    const env =
        nextTemplate.env && typeof nextTemplate.env === "object" && !Array.isArray(nextTemplate.env)
            ? { ...(nextTemplate.env as Record<string, unknown>) }
            : {};
    delete env[RUN_COMMAND_TEMPLATE_ENV_KEY];
    delete env[TEST_COMMAND_TEMPLATE_ENV_KEY];

    const configuredTemplate =
        commandTemplateEnvKeyToCopy === TEST_COMMAND_TEMPLATE_ENV_KEY
            ? settings.testCommandTemplate
            : settings.runCommandTemplate;
    env[commandTemplateEnvKeyToCopy] = configuredTemplate;
    nextTemplate.env = env;

    return {
        ...settings,
        launchConfigurationTemplate: nextTemplate,
    };
}

export async function resolveSettingsForExecution(
    target: ResolvedPythonTarget,
    initialSettings: ExecuteDialogSettings,
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
    executeDialogEnabled: boolean,
): Promise<ExecuteDialogSettings | undefined> {
    const preparedSettings = withConfiguredCommandTemplate(initialSettings, commandTemplateEnvKeyToCopy);

    if (!executeDialogEnabled) {
        return {
            ...preparedSettings,
            launchConfigurationTemplate: { ...preparedSettings.launchConfigurationTemplate },
        };
    }

    const presence = getManagedTargetPresence(
        target,
        preparedSettings.generatedLaunchNamePrefix,
        preparedSettings.launchJsonPath,
    );
    if (presence.exists) {
        return {
            ...preparedSettings,
            launchConfigurationTemplate: { ...preparedSettings.launchConfigurationTemplate },
        };
    }

    return resolveExecuteDialogSettings(target, preparedSettings, commandTemplateEnvKeyToCopy);
}
