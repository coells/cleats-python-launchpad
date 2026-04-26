import assert from "node:assert/strict";
import test from "node:test";

import { isLastTargetRecord } from "../../src/state/lastTargetRecord.js";

void test("isLastTargetRecord accepts a valid record", () => {
    assert.equal(
        isLastTargetRecord({
            filePath: "/workspace/python-samples/src/hello.py",
            workspaceFolderPath: "/workspace",
            testFramework: "pytest",
            testFunction: "test_add",
            testTarget: "/workspace/python-samples/src/test_math.py::test_add",
        }),
        true,
    );
});

void test("isLastTargetRecord rejects invalid values", () => {
    assert.equal(isLastTargetRecord(undefined), false);
    assert.equal(isLastTargetRecord({ filePath: "/workspace/file.py" }), false);
    assert.equal(isLastTargetRecord({ workspaceFolderPath: "/workspace" }), false);
    assert.equal(isLastTargetRecord({ filePath: 42, workspaceFolderPath: "/workspace" }), false);
    assert.equal(
        isLastTargetRecord({
            filePath: "/workspace/python-samples/src/hello.py",
            workspaceFolderPath: "/workspace",
            testFramework: "nose",
        }),
        false,
    );
});
