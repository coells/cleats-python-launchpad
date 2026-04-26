import { type ManagedLaunchConfig } from "../types.js";

export interface LaunchTargetDescriptor {
    fileDirname: string;
    filePath: string;
    workspaceRelativePath: string;
}

const TEMPLATE_MARKER_TYPE = "template";
const TARGET_MARKER_TYPE = "target";

const RUN_COMMAND_TEMPLATE_ENV_KEY = "CLEATS_PYTHON_LAUNCHPAD_RUN_COMMAND_TEMPLATE";

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
    runCommandTemplate: string;
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

function truncateMiddle(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    if (maxLength <= 3) {
        return value.slice(0, maxLength);
    }

    const leftLength = Math.floor((maxLength - 3) / 2);
    const rightLength = maxLength - 3 - leftLength;
    return `${value.slice(0, leftLength)}...${value.slice(value.length - rightLength)}`;
}

function shortenWorkspaceRelativePath(workspaceRelativePath: string, maxLength = 52): string {
    const normalized = workspaceRelativePath.replaceAll("\\", "/");
    if (normalized.length <= maxLength) {
        return normalized;
    }

    const parts = normalized.split("/").filter((segment) => segment.length > 0);
    if (parts.length === 0) {
        return truncateMiddle(normalized, maxLength);
    }

    const fileName = parts[parts.length - 1];
    if (parts.length === 1) {
        return truncateMiddle(fileName, maxLength);
    }

    const parent = parts[parts.length - 2];
    const tail = `.../${parent}/${fileName}`;
    if (tail.length <= maxLength) {
        return tail;
    }

    const headAndFile = `${parts[0]}/.../${fileName}`;
    if (headAndFile.length <= maxLength) {
        return headAndFile;
    }

    const compactTail = `.../${fileName}`;
    if (compactTail.length <= maxLength) {
        return compactTail;
    }

    return truncateMiddle(fileName, maxLength);
}

export function getManagedLaunchName(descriptor: LaunchTargetDescriptor, prefix: string): string {
    return `${resolveNamePrefix(prefix)}: ${shortenWorkspaceRelativePath(descriptor.workspaceRelativePath)}`;
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

function getRunCommandTemplate(config: Record<string, unknown>): string | undefined {
    const env = config.env;
    if (env && typeof env === "object") {
        const fromEnv = (env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY];
        if (typeof fromEnv === "string") {
            return fromEnv;
        }
    }

    return undefined;
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
    delete normalized.runCommandTemplate;
    delete normalized.runCommandTemplateRef;

    return normalized;
}

function buildManagedRunTemplateConfig(prefix: string, runCommandTemplate: string): ManagedRunTemplateConfig {
    return orderConfigKeys({
        name: getManagedRunTemplateName(prefix),
        type: "debugpy",
        request: "launch",
        program: "${file}",
        cwd: "${fileDirname}",
        console: "integratedTerminal",
        justMyCode: true,
        env: {
            [RUN_COMMAND_TEMPLATE_ENV_KEY]: runCommandTemplate,
        },
        presentation: {
            group: getManagedPresentationGroup(prefix),
            hidden: true,
        },
    }) as ManagedRunTemplateConfig;
}

function migrateManagedRunTemplateConfig(
    config: ManagedLaunchConfig,
    runCommandTemplate: string,
    prefix: string,
): ManagedRunTemplateConfig {
    const source = stripManagedMetadata(config as Record<string, unknown>);
    const sourceAsManaged = source as ManagedLaunchConfig;
    const existingEnv = source.env;
    const existingPresentation = source.presentation;
    const normalized: ManagedRunTemplateConfig = {
        ...sourceAsManaged,
        type: typeof sourceAsManaged.type === "string" ? sourceAsManaged.type : "debugpy",
        request: typeof sourceAsManaged.request === "string" ? sourceAsManaged.request : "launch",
        name: getManagedRunTemplateName(prefix),
        env: {
            ...(existingEnv && typeof existingEnv === "object" ? (existingEnv as Record<string, unknown>) : {}),
            [RUN_COMMAND_TEMPLATE_ENV_KEY]: runCommandTemplate,
        },
        presentation: {
            ...(existingPresentation && typeof existingPresentation === "object"
                ? (existingPresentation as Record<string, unknown>)
                : {}),
            group: getManagedPresentationGroup(prefix),
            hidden: true,
        },
    };

    return orderConfigKeys(normalized as Record<string, unknown>) as ManagedRunTemplateConfig;
}

function resolveRunTemplateConfig(
    existingConfigurations: readonly unknown[],
    prefix: string,
    defaultRunCommandTemplate: string,
): ManagedRunTemplateConfig {
    const runTemplateName = getManagedRunTemplateName(prefix);
    const existingTemplate = existingConfigurations.find((candidate): candidate is ManagedRunTemplateConfig => {
        if (!isManagedRunTemplateConfig(candidate, prefix)) {
            return false;
        }

        return candidate.name === runTemplateName;
    });

    if (!existingTemplate) {
        return buildManagedRunTemplateConfig(prefix, defaultRunCommandTemplate);
    }

    return migrateManagedRunTemplateConfig(
        existingTemplate,
        getRunCommandTemplate(existingTemplate as Record<string, unknown>) ?? defaultRunCommandTemplate,
        prefix,
    );
}

function buildTargetTemplateBase(runTemplateConfig: ManagedRunTemplateConfig): Record<string, unknown> {
    const templateBase = stripManagedMetadata(runTemplateConfig as Record<string, unknown>);
    delete templateBase.name;
    delete templateBase.env;
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
): ManagedTargetLaunchConfig {
    const targetPresentation = buildTargetPresentation(templateBase.presentation, prefix);
    const resolvedCwd =
        typeof templateBase.cwd === "string" && templateBase.cwd !== "${fileDirname}"
            ? templateBase.cwd
            : descriptor.fileDirname;

    return orderConfigKeys({
        type: "debugpy",
        request: "launch",
        console: "integratedTerminal",
        justMyCode: true,
        ...templateBase,
        name: getManagedLaunchName(descriptor, prefix),
        program: descriptor.filePath,
        cwd: resolvedCwd,
        presentation: targetPresentation,
    }) as ManagedTargetLaunchConfig;
}

export function upsertManagedLaunchConfig(
    existingConfigurations: readonly unknown[],
    descriptor: LaunchTargetDescriptor,
    prefix: string,
    defaultRunCommandTemplate: string,
): UpsertManagedLaunchResult {
    const runTemplateConfig = resolveRunTemplateConfig(existingConfigurations, prefix, defaultRunCommandTemplate);
    const runCommandTemplate =
        getRunCommandTemplate(runTemplateConfig as Record<string, unknown>) ?? defaultRunCommandTemplate;
    const nextConfiguration = buildManagedLaunchConfig(descriptor, prefix, buildTargetTemplateBase(runTemplateConfig));
    const nextName = nextConfiguration.name;

    const preserved: ManagedLaunchConfig[] = [];
    let hasManagedTemplate = false;

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
                preserved.push(
                    migrateManagedRunTemplateConfig(candidate as ManagedLaunchConfig, runCommandTemplate, prefix),
                );
                hasManagedTemplate = true;
            }
            continue;
        }

        if (config.name === nextName) {
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

    return {
        configurations: [...preserved, nextConfiguration],
        debugConfig: nextConfiguration,
        runCommandTemplate,
    };
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
