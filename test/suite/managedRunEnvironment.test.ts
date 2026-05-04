import assert from "node:assert/strict";
import test from "node:test";

import {
    mergeManagedRunEnvironment,
    parseEnvFile,
    resolveConfiguredEnvFilePath,
} from "../../src/run/managedRunEnvironmentModel.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

function makeTarget(overrides: Partial<ResolvedPythonTarget> = {}): ResolvedPythonTarget {
    return {
        document: {} as ResolvedPythonTarget["document"],
        fileUri: {} as ResolvedPythonTarget["fileUri"],
        filePath: "/workspace/python-samples/src/print_argv.py",
        fileBasename: "print_argv.py",
        fileDirname: "/workspace/python-samples/src",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
            name: "workspace",
            index: 0,
        } as unknown as ResolvedPythonTarget["workspaceFolder"],
        ...overrides,
    };
}

void test("parseEnvFile supports comments, export prefix, and quoted values", () => {
    const parsed = parseEnvFile(`
# comment
export PYTHON_LAUNCHPAD_RUN_COMMAND=uv run python {script}
SPACED = value # inline comment
QUOTED="hello\\nworld"
SINGLE='literal # value'
HASH=value#kept
EMPTY=
`);

    assert.equal(parsed.PYTHON_LAUNCHPAD_RUN_COMMAND, "uv run python {script}");
    assert.equal(parsed.SPACED, "value");
    assert.equal(parsed.QUOTED, "hello\nworld");
    assert.equal(parsed.SINGLE, "literal # value");
    assert.equal(parsed.HASH, "value#kept");
    assert.equal(parsed.EMPTY, "");
});

void test("resolveConfiguredEnvFilePath resolves workspace-based paths", () => {
    const target = makeTarget();
    const context = {
        target,
        workspaceFolderPath: "/workspace",
        workspaceFolderName: "workspace",
    };

    assert.equal(resolveConfiguredEnvFilePath(".env", context), "/workspace/.env");
    assert.equal(resolveConfiguredEnvFilePath("${workspaceFolder}/.env", context), "/workspace/.env");
    assert.equal(resolveConfiguredEnvFilePath("${workspaceFolder:workspace}/.env", context), "/workspace/.env");
    assert.equal(resolveConfiguredEnvFilePath("${workspaceFolder:other}/.env", context), undefined);
});

void test("mergeManagedRunEnvironment merges envFile and inline env with inline precedence", () => {
    const merged = mergeManagedRunEnvironment(
        {
            A: "from-file",
            B: "from-file",
            PYTHON_LAUNCHPAD_RUN_COMMAND: "uv run python {script}",
        },
        {
            A: "from-inline",
            B: null,
            C: 42,
            D: true,
            E: { nested: true },
        },
    );

    assert.equal(merged.commandTemplateEnv.A, "from-inline");
    assert.equal(merged.commandTemplateEnv.B, null);
    assert.equal(merged.commandTemplateEnv.PYTHON_LAUNCHPAD_RUN_COMMAND, "uv run python {script}");

    assert.equal(merged.processEnvOverrides.A, "from-inline");
    assert.equal(merged.processEnvOverrides.B, null);
    assert.equal(merged.processEnvOverrides.C, "42");
    assert.equal(merged.processEnvOverrides.D, "true");
    assert.equal(merged.processEnvOverrides.E, undefined);
    assert.equal(merged.processEnvOverrides.PYTHON_LAUNCHPAD_RUN_COMMAND, "uv run python {script}");
});
