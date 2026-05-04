import { basename } from "node:path";
import {
    type CommandTemplateEnvKey,
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
} from "../run/commandTemplate.js";
import { type ManagedLaunchConfig } from "../types.js";

export interface LaunchTargetDescriptor {
    filePath: string;
    workspaceFolderPath: string;
}

const TEMPLATE_MARKER_TYPE = "template";
const TARGET_MARKER_TYPE = "target";

const CONFIG_KEY_ORDER = [
    "name",
    "type",
    "request",
    "program",
    "module",
    "args",
    "cwd",
    "console",
    "justMyCode",
    "subProcess",
    "env",
    "envFile",
    "presentation",
];

interface ManagedRunTemplateConfig extends ManagedLaunchConfig {
    presentation?: {
        group?: string;
        hidden?: boolean;
    };
}

type ManagedTargetLaunchConfig = ManagedLaunchConfig;

export interface UpsertManagedLaunchResult {
    configurations: ManagedLaunchConfig[];
    debugConfig: ManagedLaunchConfig;
}

export interface RemoveManagedTargetLaunchResult {
    configurations: ManagedLaunchConfig[];
    removedCount: number;
}

function resolveNamePrefix(prefix: string): string {
    const trimmed = prefix.trim();
    return trimmed.length > 0 ? trimmed : "Launchpad";
}

function orderConfigKeys(config: Record<string, unknown>): ManagedLaunchConfig {
    const ordered: Record<string, unknown> = {};

    for (const key of CONFIG_KEY_ORDER) {
        if (key in config) {
            ordered[key] = config[key];
        }
    }

    const remainingKeys = Object.keys(config)
        .filter((key) => !CONFIG_KEY_ORDER.includes(key))
        .sort((left, right) => left.localeCompare(right));

    for (const key of remainingKeys) {
        ordered[key] = config[key];
    }

    return ordered as ManagedLaunchConfig;
}

export function getManagedLaunchName(descriptor: LaunchTargetDescriptor, prefix: string): string {
    return `${resolveNamePrefix(prefix)}: ${basename(descriptor.filePath)}`;
}

export function getManagedRunTemplateName(prefix: string): string {
    return `${resolveNamePrefix(prefix)}: Template`;
}

function getManagedPresentationGroup(prefix: string): string {
    return resolveNamePrefix(prefix);
}

function getPresentation(config: Record<string, unknown>): Record<string, unknown> | undefined {
    const presentation = config.presentation;
    if (!presentation || typeof presentation !== "object") {
        return undefined;
    }

    return presentation as Record<string, unknown>;
}

function getPresentationGroup(config: Record<string, unknown>): string | undefined {
    const presentation = getPresentation(config);
    return typeof presentation?.group === "string" ? presentation.group : undefined;
}

function getPresentationHidden(config: Record<string, unknown>): boolean | undefined {
    const presentation = getPresentation(config);
    return typeof presentation?.hidden === "boolean" ? presentation.hidden : undefined;
}

function isManagedTargetName(name: string, prefix: string): boolean {
    const runTemplateName = getManagedRunTemplateName(prefix);
    const managedPrefix = `${resolveNamePrefix(prefix)}: `;
    return name !== runTemplateName && name.startsWith(managedPrefix) && name.length > managedPrefix.length;
}

export function isManagedLaunchConfig(value: unknown, prefix = "Launchpad"): value is ManagedLaunchConfig {
    if (!value || typeof value !== "object") {
        return false;
    }

    return getManagedType(value as Record<string, unknown>, prefix) !== undefined;
}

function isManagedRunTemplateConfig(value: unknown, prefix: string): value is ManagedRunTemplateConfig {
    if (!isManagedLaunchConfig(value, prefix)) {
        return false;
    }

    return getManagedType(value as Record<string, unknown>, prefix) === TEMPLATE_MARKER_TYPE;
}

function getManagedType(
    config: Record<string, unknown>,
    prefix: string,
): typeof TEMPLATE_MARKER_TYPE | typeof TARGET_MARKER_TYPE | undefined {
    const name = typeof config.name === "string" ? config.name : undefined;
    if (!name) {
        return undefined;
    }

    const managedGroup = getManagedPresentationGroup(prefix);
    const presentationGroup = getPresentationGroup(config);
    const presentationHidden = getPresentationHidden(config);

    if (
        name === getManagedRunTemplateName(prefix) &&
        presentationGroup === managedGroup &&
        presentationHidden === true
    ) {
        return TEMPLATE_MARKER_TYPE;
    }
    if (isManagedTargetName(name, prefix) && presentationGroup === managedGroup) {
        return TARGET_MARKER_TYPE;
    }

    return undefined;
}

function normalizeManagedTemplateEnv(env: unknown): Record<string, unknown> {
    const normalized = env && typeof env === "object" ? { ...(env as Record<string, unknown>) } : {};
    if (typeof normalized[RUN_COMMAND_TEMPLATE_ENV_KEY] !== "string") {
        normalized[RUN_COMMAND_TEMPLATE_ENV_KEY] = RUN_COMMAND_TEMPLATE;
    }
    if (typeof normalized[TEST_COMMAND_TEMPLATE_ENV_KEY] !== "string") {
        normalized[TEST_COMMAND_TEMPLATE_ENV_KEY] = TEST_COMMAND_TEMPLATE;
    }
    return normalized;
}

function resolveTemplateCommandValue(env: Record<string, unknown>, envKey: CommandTemplateEnvKey): string {
    const configured = env[envKey];
    if (typeof configured === "string" && configured.trim().length > 0) {
        return configured;
    }

    return envKey === RUN_COMMAND_TEMPLATE_ENV_KEY ? RUN_COMMAND_TEMPLATE : TEST_COMMAND_TEMPLATE;
}

function selectCommandTemplateEnv(
    env: unknown,
    commandTemplateEnvKeyToCopy?: CommandTemplateEnvKey,
): Record<string, unknown> {
    const normalized = env && typeof env === "object" ? { ...(env as Record<string, unknown>) } : {};
    if (!commandTemplateEnvKeyToCopy) {
        return normalizeManagedTemplateEnv(normalized);
    }

    const selectedCommandValue = resolveTemplateCommandValue(normalized, commandTemplateEnvKeyToCopy);

    delete normalized[RUN_COMMAND_TEMPLATE_ENV_KEY];
    delete normalized[TEST_COMMAND_TEMPLATE_ENV_KEY];
    normalized[commandTemplateEnvKeyToCopy] = selectedCommandValue;
    return normalized;
}

function stripManagedMetadata(config: Record<string, unknown>): Record<string, unknown> {
    const normalized = {
        ...config,
    };

    for (const key of Object.keys(normalized)) {
        if (key.startsWith("cleatsLaunchpad") || key.startsWith("cleatsPythonLaunchpad")) {
            delete normalized[key];
        }
    }

    delete normalized.purpose;
    delete normalized.managedBy;
    delete normalized.managedRole;

    return normalized;
}

function buildManagedRunTemplateConfig(prefix: string): ManagedRunTemplateConfig {
    return orderConfigKeys({
        name: getManagedRunTemplateName(prefix),
        type: "debugpy",
        request: "launch",
        program: "${file}",
        cwd: "${workspaceFolder}",
        console: "integratedTerminal",
        justMyCode: true,
        env: normalizeManagedTemplateEnv(undefined),
        presentation: {
            group: getManagedPresentationGroup(prefix),
            hidden: true,
        },
    }) as ManagedRunTemplateConfig;
}

function resolveRunTemplateConfig(
    existingConfigurations: readonly unknown[],
    prefix: string,
): ManagedRunTemplateConfig {
    const runTemplateName = getManagedRunTemplateName(prefix);
    const existingTemplate = existingConfigurations.find((candidate): candidate is ManagedRunTemplateConfig => {
        if (!isManagedRunTemplateConfig(candidate, prefix)) {
            return false;
        }

        return candidate.name === runTemplateName;
    });

    if (!existingTemplate) {
        return buildManagedRunTemplateConfig(prefix);
    }

    return existingTemplate;
}

function buildTargetTemplateBase(runTemplateConfig: ManagedRunTemplateConfig): Record<string, unknown> {
    const templateBase = stripManagedMetadata(runTemplateConfig as Record<string, unknown>);
    delete templateBase.name;
    return templateBase;
}

function buildTargetPresentation(source: unknown, prefix: string): Record<string, unknown> {
    const basePresentation = source && typeof source === "object" ? { ...(source as Record<string, unknown>) } : {};

    delete basePresentation.hidden;

    return {
        ...basePresentation,
        group: getManagedPresentationGroup(prefix),
    };
}

export function buildManagedLaunchConfig(
    descriptor: LaunchTargetDescriptor,
    prefix: string,
    templateBase: Record<string, unknown> = {},
    commandTemplateEnvKeyToCopy?: CommandTemplateEnvKey,
): ManagedTargetLaunchConfig {
    const targetPresentation = buildTargetPresentation(templateBase.presentation, prefix);
    const resolvedCwd =
        typeof templateBase.cwd === "string" && templateBase.cwd.trim().length > 0
            ? templateBase.cwd
            : descriptor.workspaceFolderPath;
    const resolvedEnv = selectCommandTemplateEnv(templateBase.env, commandTemplateEnvKeyToCopy);

    return orderConfigKeys({
        type: "debugpy",
        request: "launch",
        console: "integratedTerminal",
        justMyCode: true,
        ...templateBase,
        name: getManagedLaunchName(descriptor, prefix),
        program: descriptor.filePath,
        cwd: resolvedCwd,
        env: resolvedEnv,
        presentation: targetPresentation,
    }) as ManagedTargetLaunchConfig;
}

export function upsertManagedLaunchConfig(
    existingConfigurations: readonly unknown[],
    descriptor: LaunchTargetDescriptor,
    prefix: string,
    managedTargetConfigurationLimit = 10,
    commandTemplateEnvKeyToCopy?: CommandTemplateEnvKey,
): UpsertManagedLaunchResult {
    const runTemplateConfig = resolveRunTemplateConfig(existingConfigurations, prefix);
    const nextConfiguration = buildManagedLaunchConfig(
        descriptor,
        prefix,
        buildTargetTemplateBase(runTemplateConfig),
        commandTemplateEnvKeyToCopy,
    );
    const nextName = nextConfiguration.name;
    let debugConfig = nextConfiguration;

    const preserved: ManagedLaunchConfig[] = [];
    let hasManagedTemplate = false;
    let replacedExistingTarget = false;

    for (const candidate of existingConfigurations) {
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        const config = candidate as Record<string, unknown>;
        const role = getManagedType(config, prefix);

        if (!role) {
            preserved.push(candidate as ManagedLaunchConfig);
            continue;
        }

        if (role === TEMPLATE_MARKER_TYPE) {
            if (!hasManagedTemplate) {
                preserved.push(candidate as ManagedLaunchConfig);
                hasManagedTemplate = true;
            }
            continue;
        }

        const existingProgram = typeof config.program === "string" ? config.program : undefined;
        const isSameTarget = existingProgram ? existingProgram === descriptor.filePath : config.name === nextName;
        if (isSameTarget) {
            preserved.push(candidate as ManagedLaunchConfig);
            debugConfig = candidate as ManagedLaunchConfig;
            replacedExistingTarget = true;
            continue;
        }

        const strippedConfig = stripManagedMetadata(config) as ManagedLaunchConfig;
        const migratedTarget = {
            ...strippedConfig,
            type: typeof strippedConfig.type === "string" ? strippedConfig.type : "debugpy",
            request: typeof strippedConfig.request === "string" ? strippedConfig.request : "launch",
            name: typeof strippedConfig.name === "string" ? strippedConfig.name : "",
            presentation: buildTargetPresentation(strippedConfig.presentation, prefix),
        };
        preserved.push(orderConfigKeys(migratedTarget as Record<string, unknown>));
    }

    if (!hasManagedTemplate) {
        preserved.push(runTemplateConfig);
    }

    if (!replacedExistingTarget) {
        preserved.push(nextConfiguration);
        debugConfig = nextConfiguration;
    }

    const targetLimit = Math.max(1, Math.floor(managedTargetConfigurationLimit));
    const trimmed = trimManagedTargetsToLimit(preserved, prefix, targetLimit);

    return {
        configurations: trimmed,
        debugConfig,
    };
}

function trimManagedTargetsToLimit(
    configurations: ManagedLaunchConfig[],
    prefix: string,
    targetLimit: number,
): ManagedLaunchConfig[] {
    const targetIndices: number[] = [];

    for (let index = 0; index < configurations.length; index += 1) {
        const candidate = configurations[index] as unknown;
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        if (getManagedType(candidate as Record<string, unknown>, prefix) === TARGET_MARKER_TYPE) {
            targetIndices.push(index);
        }
    }

    if (targetIndices.length <= targetLimit) {
        return configurations;
    }

    const removeCount = targetIndices.length - targetLimit;
    const indicesToRemove = new Set(targetIndices.slice(0, removeCount));
    return configurations.filter((_, index) => !indicesToRemove.has(index));
}

export function removeManagedTargetLaunchConfigs(
    existingConfigurations: readonly unknown[],
    prefix: string,
): RemoveManagedTargetLaunchResult {
    const configurations: ManagedLaunchConfig[] = [];
    let removedCount = 0;

    for (const candidate of existingConfigurations) {
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        const config = candidate as Record<string, unknown>;
        if (getManagedType(config, prefix) === TARGET_MARKER_TYPE) {
            removedCount += 1;
            continue;
        }

        configurations.push(candidate as ManagedLaunchConfig);
    }

    return {
        configurations,
        removedCount,
    };
}
