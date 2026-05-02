import assert from "node:assert/strict";
import test from "node:test";

import { isPytestFile, resolvePytestTargetFromSource } from "../../src/run/pytestTarget.js";

void test("isPytestFile detects common pytest naming", () => {
    assert.equal(isPytestFile("test_math.py"), true);
    assert.equal(isPytestFile("math_test.py"), true);
    assert.equal(isPytestFile("script.py"), false);
});

void test("resolvePytestTargetFromSource returns file target outside functions", () => {
    const source = ["import pytest", "", "VALUE = 1"].join("\n");

    const result = resolvePytestTargetFromSource("/workspace/tests/test_math.py", source, 2);

    assert.equal(result.testFunction, "");
    assert.equal(result.testTarget, "/workspace/tests/test_math.py");
});

void test("resolvePytestTargetFromSource returns function target", () => {
    const source = ["def test_addition():", "    value = 1 + 1", "    assert value == 2"].join("\n");

    const result = resolvePytestTargetFromSource("/workspace/tests/test_math.py", source, 2);

    assert.equal(result.testFunction, "test_addition");
    assert.equal(result.testTarget, "/workspace/tests/test_math.py::test_addition");
});

void test("resolvePytestTargetFromSource returns class method target", () => {
    const source = [
        "class TestMath:",
        "    def test_addition(self):",
        "        assert 1 + 1 == 2",
        "",
        "    def test_subtraction(self):",
        "        assert 2 - 1 == 1",
    ].join("\n");

    const result = resolvePytestTargetFromSource("/workspace/tests/test_math.py", source, 5);

    assert.equal(result.testFunction, "test_subtraction");
    assert.equal(result.testTarget, "/workspace/tests/test_math.py::TestMath::test_subtraction");
});
