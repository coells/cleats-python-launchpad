import assert from "node:assert/strict";
import test from "node:test";

import { buildUnittestDebugConfig } from "../../src/debug/unittestDebugConfig.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

void test("buildUnittestDebugConfig creates a debugpy unittest launch config", () => {
    const target = {
        fileBasename: "test_launchpad_samples.py",
        fileDirname: "/workspace/python-samples/src",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const config = buildUnittestDebugConfig(target, "tests.test_launchpad_samples.TestRun.test_hello");

    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.module, "unittest");
    assert.deepEqual(config.args, ["tests.test_launchpad_samples.TestRun.test_hello"]);
    assert.equal(config.cwd, "/workspace");
    assert.equal(config.console, "integratedTerminal");
    assert.equal(config.justMyCode, true);
});

void test("buildUnittestDebugConfig appends -k filter when provided", () => {
    const target = {
        fileBasename: "test_launchpad_samples.py",
        fileDirname: "/workspace/python-samples/src",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const config = buildUnittestDebugConfig(
        target,
        "/workspace/python-samples/src/test_launchpad_samples.py",
        "TestRun.test_hello",
    );

    assert.deepEqual(config.args, [
        "/workspace/python-samples/src/test_launchpad_samples.py",
        "-k",
        "TestRun.test_hello",
    ]);
});

void test("buildUnittestDebugConfig inherits template-derived debug properties", () => {
    const target = {
        fileBasename: "test_launchpad_samples.py",
        fileDirname: "/workspace/python-samples/src",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const config = buildUnittestDebugConfig(target, "tests.test_launchpad_samples.TestRun.test_hello", undefined, {
        name: "template base",
        type: "debugpy",
        request: "launch",
        program: "${file}",
        code: "print('hello')",
        cwd: "${workspaceFolder}",
        console: "internalConsole",
        justMyCode: false,
    });

    assert.equal(config.cwd, "${workspaceFolder}");
    assert.equal(config.console, "internalConsole");
    assert.equal(config.justMyCode, false);
    assert.equal((config as Record<string, unknown>).program, undefined);
    assert.equal((config as Record<string, unknown>).code, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadManaged, undefined);
    assert.equal((config as Record<string, unknown>).cleatsPythonLaunchpadRole, undefined);
});
