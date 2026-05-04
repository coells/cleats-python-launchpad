import { basename, isAbsolute, relative, resolve } from "node:path";

import type { ResolvedPythonTarget } from "../types.js";

const SUPPORTED_ENV_FILE_VARIABLE_PATTERN =
    /\$\{(workspaceFolder(?::[^}]+)?|workspaceFolderBasename|file|fileDirname|fileBasename|relativeFile)\}/g;

export interface ResolvedManagedRunEnvironment {
    commandTemplateEnv: Record<string, unknown>;
    processEnvOverrides: Record<string, string | null>;
}

export interface EnvFilePathContext {
    target: ResolvedPythonTarget;
    workspaceFolderPath: string;
    workspaceFolderName: string;
}

function decodeDoubleQuotedValue(value: string): string {
    return value.replace(/\\([nrt"\\])/g, (_match, escaped: string) => {
        switch (escaped) {
            case "n":
                return "\n";
            case "r":
                return "\r";
            case "t":
                return "\t";
            case '"':
                return '"';
            case "\\":
                return "\\";
            default:
                return escaped;
        }
    });
}

export function parseEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};

    for (const rawLine of content.replace(/^\uFEFF/, "").split(/\r?\n/u)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) {
            continue;
        }

        const assignment = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
        if (!assignment) {
            continue;
        }

        const key = assignment[1];
        const rawValue = assignment[2].trim();

        const doubleQuoted = rawValue.match(/^"((?:\\.|[^"\\])*)"(?:\s+#.*)?$/u);
        if (doubleQuoted) {
            env[key] = decodeDoubleQuotedValue(doubleQuoted[1]);
            continue;
        }

        const singleQuoted = rawValue.match(/^'([^']*)'(?:\s+#.*)?$/u);
        if (singleQuoted) {
            env[key] = singleQuoted[1];
            continue;
        }

        env[key] = rawValue.replace(/\s+#.*$/u, "").trim();
    }

    return env;
}

export function resolveConfiguredEnvFilePath(
    configuredEnvFile: unknown,
    context: EnvFilePathContext,
): string | undefined {
    if (typeof configuredEnvFile !== "string" || configuredEnvFile.trim().length === 0) {
        return undefined;
    }

    const workspaceFolderPath = context.workspaceFolderPath;
    const relativeFile = relative(workspaceFolderPath, context.target.filePath).replaceAll("\\", "/");
    const replacements: Record<string, string> = {
        workspaceFolderBasename: basename(workspaceFolderPath),
        file: context.target.filePath,
        fileDirname: context.target.fileDirname,
        fileBasename: context.target.fileBasename,
        relativeFile,
    };

    const substituted = configuredEnvFile.trim().replace(SUPPORTED_ENV_FILE_VARIABLE_PATTERN, (value, key: string) => {
        if (key === "workspaceFolder") {
            return workspaceFolderPath;
        }

        if (key.startsWith("workspaceFolder:")) {
            const requestedWorkspaceName = key.slice("workspaceFolder:".length);
            return requestedWorkspaceName === context.workspaceFolderName ? workspaceFolderPath : value;
        }

        return replacements[key] ?? value;
    });

    if (substituted.includes("${")) {
        return undefined;
    }

    if (isAbsolute(substituted)) {
        return substituted;
    }

    return resolve(workspaceFolderPath, substituted);
}

export function mergeManagedRunEnvironment(
    envFromFile: Record<string, string>,
    inlineEnv: unknown,
): ResolvedManagedRunEnvironment {
    const inline = inlineEnv && typeof inlineEnv === "object" ? (inlineEnv as Record<string, unknown>) : {};
    const commandTemplateEnv: Record<string, unknown> = {
        ...envFromFile,
        ...inline,
    };

    const processEnvOverrides: Record<string, string | null> = {
        ...envFromFile,
    };

    for (const [key, value] of Object.entries(inline)) {
        if (value === null) {
            processEnvOverrides[key] = null;
            continue;
        }

        if (typeof value === "string") {
            processEnvOverrides[key] = value;
            continue;
        }

        if (typeof value === "number" || typeof value === "boolean") {
            processEnvOverrides[key] = String(value);
        }
    }

    return {
        commandTemplateEnv,
        processEnvOverrides,
    };
}
