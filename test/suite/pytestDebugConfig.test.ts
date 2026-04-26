import assert from "node:assert/strict";
import test from "node:test";

import { buildPytestDebugConfig } from "../../src/debug/pytestDebugConfig.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

void test("buildPytestDebugConfig creates a debugpy pytest launch config", () => {
    const target = {
        fileBasename: "test_launchpad_samples.py",
        fileDirname: "/workspace/python-samples/src",
    } as unknown as ResolvedPythonTarget;

    const config = buildPytestDebugConfig(
        target,
        "/workspace/python-samples/src/test_launchpad_samples.py::test_print_argv_includes_custom_argument",
    );

    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.module, "pytest");
    assert.deepEqual(config.args, [
        "/workspace/python-samples/src/test_launchpad_samples.py::test_print_argv_includes_custom_argument",
    ]);
    assert.equal(config.cwd, "/workspace/python-samples/src");
    assert.equal(config.console, "integratedTerminal");
    assert.equal(config.justMyCode, true);
});

void test("buildPytestDebugConfig inherits template-derived debug properties", () => {
    const target = {
        fileBasename: "test_launchpad_samples.py",
        fileDirname: "/workspace/python-samples/src",
    } as unknown as ResolvedPythonTarget;

    const config = buildPytestDebugConfig(
        target,
        "/workspace/python-samples/src/test_launchpad_samples.py::test_print_argv_includes_custom_argument",
        {
            name: "template base",
            type: "debugpy",
            request: "launch",
            program: "${file}",
            code: "print('hello')",
            cwd: "${workspaceFolder}",
            console: "internalConsole",
            justMyCode: false,
        },
    );

    assert.equal(config.cwd, "${workspaceFolder}");
    assert.equal(config.console, "internalConsole");
    assert.equal(config.justMyCode, false);
    assert.equal((config as Record<string, unknown>).program, undefined);
    assert.equal((config as Record<string, unknown>).code, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadManaged, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadRole, undefined);
});
