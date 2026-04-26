import assert from "node:assert/strict";
import test from "node:test";

import { expandCommandTemplate } from "../../src/run/commandTemplate.js";

void test("expandCommandTemplate replaces all supported placeholders", () => {
    const result = expandCommandTemplate(
        "uv run python {script} --cwd {fileDirname} --name {fileBasename} --root {workspaceFolder}",
        {
            fileBasename: "hello.py",
            fileDirname: "/workspace/python-samples/src",
            pytestFunction: "",
            pytestTarget: "/workspace/python-samples/src/hello.py",
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
        pytestFunction: "",
        pytestTarget: "/workspace/script.py",
        script: "/workspace/script.py",
        testFunction: "",
        testTarget: "/workspace/script.py",
        workspaceFolder: "/workspace",
    });

    assert.match(result, /script\.py/);
    assert.equal(result.includes("{fileBasename}"), false);
});

void test("expandCommandTemplate replaces pytest placeholders", () => {
    const result = expandCommandTemplate("uv run pytest {pytestTarget} -k {pytestFunction}", {
        fileBasename: "test_math.py",
        fileDirname: "/workspace/tests",
        pytestFunction: "test_add",
        pytestTarget: "/workspace/tests/test_math.py::TestMath::test_add",
        script: "/workspace/tests/test_math.py",
        testFunction: "test_add",
        testTarget: "/workspace/tests/test_math.py::TestMath::test_add",
        workspaceFolder: "/workspace",
    });

    assert.match(result, /pytest/);
    assert.match(result, /test_math\.py::TestMath::test_add/);
    assert.match(result, /test_add/);
    assert.equal(result.includes("{pytestTarget}"), false);
    assert.equal(result.includes("{pytestFunction}"), false);
});

void test("expandCommandTemplate replaces generic test placeholders", () => {
    const result = expandCommandTemplate("python -m unittest {testTarget} -k {testFunction}", {
        fileBasename: "test_math.py",
        fileDirname: "/workspace/tests",
        pytestFunction: "TestMath.test_add",
        pytestTarget: "tests.test_math.TestMath.test_add",
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
