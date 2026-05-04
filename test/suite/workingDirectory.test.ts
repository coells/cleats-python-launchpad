import assert from "node:assert/strict";
import test from "node:test";

import { resolveRunWorkingDirectory } from "../../src/run/workingDirectory.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

function makeTarget(overrides: Partial<ResolvedPythonTarget> = {}): ResolvedPythonTarget {
    return {
        document: {} as ResolvedPythonTarget["document"],
        fileUri: {} as ResolvedPythonTarget["fileUri"],
        filePath: "/workspace/python-samples/src/hello.py",
        fileBasename: "hello.py",
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

void test("resolveRunWorkingDirectory falls back to workspace root", () => {
    const target = makeTarget();

    assert.equal(resolveRunWorkingDirectory(target, undefined), "/workspace");
    assert.equal(resolveRunWorkingDirectory(target, "   "), "/workspace");
});

void test("resolveRunWorkingDirectory resolves fileDirname variable", () => {
    const target = makeTarget();

    assert.equal(resolveRunWorkingDirectory(target, "${fileDirname}"), "/workspace/python-samples/src");
});

void test("resolveRunWorkingDirectory resolves workspaceFolder variable", () => {
    const target = makeTarget();

    assert.equal(resolveRunWorkingDirectory(target, "${workspaceFolder}/python-samples"), "/workspace/python-samples");
});

void test("resolveRunWorkingDirectory resolves relative paths from workspace root", () => {
    const target = makeTarget();

    assert.equal(resolveRunWorkingDirectory(target, "python-samples/src"), "/workspace/python-samples/src");
});

void test("resolveRunWorkingDirectory falls back when unsupported variables remain", () => {
    const target = makeTarget();

    assert.equal(resolveRunWorkingDirectory(target, "${command:pickPath}"), "/workspace");
});
