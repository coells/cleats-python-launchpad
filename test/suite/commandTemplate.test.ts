import assert from "node:assert/strict";
import test from "node:test";

import { expandCommandTemplate } from "../../src/run/commandTemplate.js";

void test("expandCommandTemplate replaces all supported placeholders", () => {
    const result = expandCommandTemplate(
        "uv run python {script} --cwd {fileDirname} --name {fileBasename} --root {workspaceFolder}",
        {
            fileBasename: "hello.py",
            fileDirname: "/workspace/python-samples/src",
            script: "/workspace/python-samples/src/hello.py",
            testFunction: "",
            testTarget: "/workspace/python-samples/src/hello.py",
            workspaceFolder: "/workspace",
        },
    );

    assert.match(result, /uv run python/);
    assert.match(result, /hello\.py/);
    assert.match(result, /python-samples\/src/);
    assert.match(result, /\/workspace/);
});

void test("expandCommandTemplate replaces repeated placeholders", () => {
    const result = expandCommandTemplate("echo {fileBasename} {fileBasename}", {
        fileBasename: "script.py",
        fileDirname: "/workspace",
        script: "/workspace/script.py",
        testFunction: "",
        testTarget: "/workspace/script.py",
        workspaceFolder: "/workspace",
    });

    assert.match(result, /script\.py/);
    assert.equal(result.includes("{fileBasename}"), false);
});

void test("expandCommandTemplate leaves unknown placeholders untouched", () => {
    const result = expandCommandTemplate("uv run pytest {legacyTarget} -k {legacyFunction}", {
        fileBasename: "test_math.py",
        fileDirname: "/workspace/tests",
        script: "/workspace/tests/test_math.py",
        testFunction: "test_add",
        testTarget: "/workspace/tests/test_math.py::TestMath::test_add",
        workspaceFolder: "/workspace",
    });

    assert.match(result, /pytest/);
    assert.equal(result.includes("{legacyTarget}"), true);
    assert.equal(result.includes("{legacyFunction}"), true);
});

void test("expandCommandTemplate replaces generic test placeholders", () => {
    const result = expandCommandTemplate("python -m unittest {testTarget} -k {testFunction}", {
        fileBasename: "test_math.py",
        fileDirname: "/workspace/tests",
        script: "/workspace/tests/test_math.py",
        testFunction: "TestMath.test_add",
        testTarget: "tests.test_math.TestMath.test_add",
        workspaceFolder: "/workspace",
    });

    assert.match(result, /python -m unittest/);
    assert.match(result, /tests\.test_math\.TestMath\.test_add/);
    assert.equal(result.includes("{testTarget}"), false);
    assert.equal(result.includes("{testFunction}"), false);
});
