import assert from "node:assert/strict";
import test from "node:test";

import { resolveUnittestTargetFromSource } from "../../src/run/unittestTarget.js";
import type { ResolvedPythonTarget } from "../../src/types.js";

void test("resolveUnittestTargetFromSource returns file target outside functions", () => {
    const target = {
        filePath: "/workspace/tests/test_math.py",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const source = ["import unittest", "", "VALUE = 1"].join("\n");
    const result = resolveUnittestTargetFromSource(target, source, 2);

    assert.equal(result.testFunction, "");
    assert.equal(result.testTarget, "/workspace/tests/test_math.py");
    assert.equal(result.unittestFilter, undefined);
});

void test("resolveUnittestTargetFromSource returns dotted module target for methods", () => {
    const target = {
        filePath: "/workspace/tests/test_math.py",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const source = [
        "class TestMath:",
        "    def test_addition(self):",
        "        assert 1 + 1 == 2",
        "",
        "    def test_subtraction(self):",
        "        assert 2 - 1 == 1",
    ].join("\n");

    const result = resolveUnittestTargetFromSource(target, source, 5);

    assert.equal(result.testFunction, "TestMath.test_subtraction");
    assert.equal(result.testTarget, "tests.test_math.TestMath.test_subtraction");
    assert.equal(result.unittestFilter, undefined);
});

void test("resolveUnittestTargetFromSource falls back to file target for non-module paths", () => {
    const target = {
        filePath: "/workspace/python-samples/tests/test_math.py",
        workspaceFolder: {
            uri: {
                fsPath: "/workspace",
            },
        },
    } as unknown as ResolvedPythonTarget;

    const source = ["class TestMath:", "    def test_addition(self):", "        assert 1 + 1 == 2"].join("\n");

    const result = resolveUnittestTargetFromSource(target, source, 2);

    assert.equal(result.testFunction, "TestMath.test_addition");
    assert.equal(result.testTarget, "/workspace/python-samples/tests/test_math.py");
    assert.equal(result.unittestFilter, "TestMath.test_addition");
});
