import { basename, isAbsolute, relative, resolve } from "node:path";

import type { ResolvedPythonTarget } from "../types.js";

const SUPPORTED_CWD_VARIABLE_PATTERN =
    /\$\{(workspaceFolder|workspaceFolderBasename|file|fileDirname|fileBasename|relativeFile)\}/g;

export function resolveRunWorkingDirectory(target: ResolvedPythonTarget, configuredCwd: unknown): string {
    const workspaceFolder = target.workspaceFolder.uri.fsPath;
    if (typeof configuredCwd !== "string" || configuredCwd.trim().length === 0) {
        return workspaceFolder;
    }

    const relativeFile = relative(workspaceFolder, target.filePath).replaceAll("\\", "/");
    const replacements: Record<string, string> = {
        workspaceFolder,
        workspaceFolderBasename: basename(workspaceFolder),
        file: target.filePath,
        fileDirname: target.fileDirname,
        fileBasename: target.fileBasename,
        relativeFile,
    };

    const substitutedCwd = configuredCwd
        .trim()
        .replace(SUPPORTED_CWD_VARIABLE_PATTERN, (value, key: string) => replacements[key] ?? value);

    if (substitutedCwd.includes("${")) {
        return workspaceFolder;
    }

    if (isAbsolute(substitutedCwd)) {
        return substitutedCwd;
    }

    return resolve(workspaceFolder, substitutedCwd);
}
