import assert from "node:assert/strict";
import test from "node:test";

import { parsePythonScopesUntilLine } from "../../src/run/pythonScope.js";

void test("parsePythonScopesUntilLine tracks class and function scopes by cursor line", () => {
    const source = [
        "class TestMath:",
        "    def test_addition(self):",
        "        assert 1 + 1 == 2",
        "",
        "    def test_subtraction(self):",
        "        assert 2 - 1 == 1",
    ];

    const scopes = parsePythonScopesUntilLine(source, 5);

    assert.deepEqual(
        scopes.map((scope) => `${scope.kind}:${scope.name}`),
        ["class:TestMath", "function:test_subtraction"],
    );
});

void test("parsePythonScopesUntilLine ignores comments and closes scope on dedent", () => {
    const source = ["def test_root():", "    assert True", "", "# outside function", "VALUE = 1"];

    const scopes = parsePythonScopesUntilLine(source, 4);
    assert.deepEqual(scopes, []);
});
