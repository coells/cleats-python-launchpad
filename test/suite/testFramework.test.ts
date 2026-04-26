import assert from "node:assert/strict";
import test from "node:test";

import { isTestFile } from "../../src/run/testFile.js";

void test("isTestFile detects common Python test naming", () => {
    assert.equal(isTestFile("test_math.py"), true);
    assert.equal(isTestFile("testmath.py"), true);
    assert.equal(isTestFile("math_test.py"), true);
    assert.equal(isTestFile("script.py"), false);
});
