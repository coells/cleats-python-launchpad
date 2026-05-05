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
    workspaceFolderName?: string;
}

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

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function isManagedTargetName(name: string, prefix: string): boolean {
    const normalizedPrefix = resolveNamePrefix(prefix);
    const managedNamePattern = new RegExp(`^${escapeRegExp(normalizedPrefix)}: [^/\\\\]+(?: \\([1-9][0-9]*\\))?$`);
    return managedNamePattern.test(name);
}

export function isManagedLaunchConfig(value: unknown, prefix = "Launchpad"): value is ManagedLaunchConfig {
    if (!value || typeof value !== "object") {
        return false;
    }

    return getManagedType(value as Record<string, unknown>, prefix) !== undefined;
}

function getManagedType(config: Record<string, unknown>, prefix: string): typeof TARGET_MARKER_TYPE | undefined {
    const name = typeof config.name === "string" ? config.name : undefined;
    if (!name) {
        return undefined;
    }

    const managedGroup = getManagedPresentationGroup(prefix);
    const presentationGroup = getPresentationGroup(config);

    if (isManagedTargetName(name, prefix) && presentationGroup === managedGroup) {
        return TARGET_MARKER_TYPE;
    }

    return undefined;
}

function getProgramPath(config: Record<string, unknown>): string | undefined {
    return typeof config.program === "string" ? config.program : undefined;
}

function isManagedConfigForTarget(
    config: Record<string, unknown>,
    descriptor: LaunchTargetDescriptor,
    prefix: string,
): boolean {
    return getManagedType(config, prefix) === TARGET_MARKER_TYPE && getProgramPath(config) === descriptor.filePath;
}

function resolveUniqueManagedLaunchName(existingConfigurations: readonly unknown[], baseName: string): string {
    const existingNames = new Set<string>();

    for (const candidate of existingConfigurations) {
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        const name = (candidate as Record<string, unknown>).name;
        if (typeof name === "string") {
            existingNames.add(name);
        }
    }

    if (!existingNames.has(baseName)) {
        return baseName;
    }

    let suffix = 2;
    while (existingNames.has(`${baseName} (${suffix})`)) {
        suffix += 1;
    }

    return `${baseName} (${suffix})`;
}

export function hasManagedLaunchConfigForTarget(
    existingConfigurations: readonly unknown[],
    descriptor: LaunchTargetDescriptor,
    prefix: string,
): boolean {
    return existingConfigurations.some(
        (candidate) =>
            !!candidate &&
            typeof candidate === "object" &&
            isManagedConfigForTarget(candidate as Record<string, unknown>, descriptor, prefix),
    );
}

function normalizeLaunchConfigurationTemplate(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return { ...(value as Record<string, unknown>) };
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
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
): Record<string, unknown> {
    const normalized = env && typeof env === "object" ? { ...(env as Record<string, unknown>) } : {};
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
        if (key.startsWith("cleatsPythonLaunchpad")) {
            delete normalized[key];
        }
    }

    delete normalized.purpose;
    delete normalized.managedBy;
    delete normalized.managedRole;

    return normalized;
}

function buildTargetTemplateBase(launchConfigurationTemplate: Record<string, unknown>): Record<string, unknown> {
    const configuredOverrides = stripManagedMetadata(normalizeLaunchConfigurationTemplate(launchConfigurationTemplate));

    delete configuredOverrides.name;

    return configuredOverrides;
}

function buildTargetPresentation(source: unknown, prefix: string): Record<string, unknown> {
    const basePresentation = source && typeof source === "object" ? { ...(source as Record<string, unknown>) } : {};

    delete basePresentation.hidden;

    return {
        ...basePresentation,
        group: getManagedPresentationGroup(prefix),
    };
}

function getDefaultManagedCwd(descriptor: LaunchTargetDescriptor): string {
    const workspaceFolderName = descriptor.workspaceFolderName?.trim();
    if (!workspaceFolderName) {
        return "${workspaceFolder}";
    }

    return `\${workspaceFolder:${workspaceFolderName}}`;
}

export function buildManagedLaunchConfig(
    descriptor: LaunchTargetDescriptor,
    prefix: string,
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
    templateBase: Record<string, unknown> = {},
    managedName?: string,
): ManagedTargetLaunchConfig {
    const targetPresentation = buildTargetPresentation(templateBase.presentation, prefix);
    const resolvedCwd =
        typeof templateBase.cwd === "string" && templateBase.cwd.trim().length > 0
            ? templateBase.cwd
            : getDefaultManagedCwd(descriptor);
    const resolvedEnv = selectCommandTemplateEnv(templateBase.env, commandTemplateEnvKeyToCopy);

    return orderConfigKeys({
        type: "debugpy",
        request: "launch",
        console: "integratedTerminal",
        justMyCode: true,
        ...templateBase,
        name: managedName ?? getManagedLaunchName(descriptor, prefix),
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
    commandTemplateEnvKeyToCopy: CommandTemplateEnvKey,
    managedTargetConfigurationLimit = 10,
    launchConfigurationTemplate: Record<string, unknown> = {},
): UpsertManagedLaunchResult {
    const targetTemplateBase = buildTargetTemplateBase(launchConfigurationTemplate);
    const preserved: ManagedLaunchConfig[] = [];
    let existingTargetConfig: ManagedLaunchConfig | undefined;

    for (const candidate of existingConfigurations) {
        if (!candidate || typeof candidate !== "object") {
            continue;
        }

        const config = candidate as Record<string, unknown>;
        preserved.push(candidate as ManagedLaunchConfig);

        if (existingTargetConfig) {
            continue;
        }

        if (isManagedConfigForTarget(config, descriptor, prefix)) {
            existingTargetConfig = candidate as ManagedLaunchConfig;
        }
    }

    if (existingTargetConfig) {
        return {
            configurations: preserved,
            debugConfig: existingTargetConfig,
        };
    }

    const baseManagedName = getManagedLaunchName(descriptor, prefix);
    const resolvedManagedName = resolveUniqueManagedLaunchName(existingConfigurations, baseManagedName);
    const nextConfiguration = buildManagedLaunchConfig(
        descriptor,
        prefix,
        commandTemplateEnvKeyToCopy,
        targetTemplateBase,
        resolvedManagedName,
    );
    preserved.push(nextConfiguration);

    const targetLimit = Math.max(1, Math.floor(managedTargetConfigurationLimit));
    const trimmed = trimManagedTargetsToLimit(preserved, prefix, targetLimit);

    return {
        configurations: trimmed,
        debugConfig: nextConfiguration,
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
