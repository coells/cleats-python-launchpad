import assert from "node:assert/strict";
import test from "node:test";
import type * as vscode from "vscode";

import { buildInlineModuleDebugConfig } from "../../src/debug/inlineDebugConfig.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

const target = {
    fileBasename: "test_example.py",
    workspaceFolder: {
        uri: {
            fsPath: "/workspace",
        },
    },
} as unknown as ResolvedPythonTarget;

void test("buildInlineModuleDebugConfig applies defaults without base config", () => {
    const config = buildInlineModuleDebugConfig(
        target,
        "pytest",
        ["/workspace/tests/test_example.py::test_ok"],
        "pytest",
    );

    assert.equal(config.name, "Debug: test_example.py (pytest)");
    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.module, "pytest");
    assert.deepEqual(config.args, ["/workspace/tests/test_example.py::test_ok"]);
    assert.equal(config.cwd, "/workspace");
    assert.equal(config.console, "integratedTerminal");
    assert.equal(config.justMyCode, true);
});

void test("buildInlineModuleDebugConfig strips managed metadata and transient program/code", () => {
    const config = buildInlineModuleDebugConfig(
        target,
        "unittest",
        ["tests.test_example.TestCase.test_ok"],
        "unittest",
        {
            name: "template",
            type: "debugpy",
            request: "launch",
            program: "${file}",
            code: "print('hello')",
            cwd: "${workspaceFolder}",
            console: "internalConsole",
            justMyCode: false,
            cleatsPythonLaunchpadManaged: true,
            cleatsPythonLaunchpadRole: "target",
            managedBy: "cleats-python-launchpad",
            managedRole: "target",
        } as unknown as vscode.DebugConfiguration,
    );

    assert.equal(config.name, "Debug: test_example.py (unittest)");
    assert.equal(config.module, "unittest");
    assert.deepEqual(config.args, ["tests.test_example.TestCase.test_ok"]);
    assert.equal(config.cwd, "${workspaceFolder}");
    assert.equal(config.console, "internalConsole");
    assert.equal(config.justMyCode, false);
    assert.equal((config as Record<string, unknown>).program, undefined);
    assert.equal((config as Record<string, unknown>).code, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadManaged, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadRole, undefined);
    assert.equal((config as Record<string, unknown>).managedBy, undefined);
    assert.equal((config as Record<string, unknown>).managedRole, undefined);
});
