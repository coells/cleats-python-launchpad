import assert from "node:assert/strict";
import test from "node:test";

import {
    formatDebugStartFailureMessage,
    resolveCommandTemplateEnvKey,
    resolveConfiguredFrameworkForTargetFile,
    resolveEffectiveTestFramework,
    resolveLastUnittestFilter,
} from "../../src/commands/commandExecutionModel.js";
import { RUN_COMMAND_TEMPLATE_ENV_KEY, TEST_COMMAND_TEMPLATE_ENV_KEY } from "../../src/run/commandTemplate.js";

void test("resolveConfiguredFrameworkForTargetFile returns pytest default for test files", () => {
    assert.equal(resolveConfiguredFrameworkForTargetFile(true, undefined), "pytest");
    assert.equal(resolveConfiguredFrameworkForTargetFile(true, "unittest"), "unittest");
    assert.equal(resolveConfiguredFrameworkForTargetFile(false, "pytest"), undefined);
});

void test("resolveEffectiveTestFramework prefers stored framework", () => {
    assert.equal(resolveEffectiveTestFramework("pytest", "unittest"), "unittest");
    assert.equal(resolveEffectiveTestFramework("pytest", undefined), "pytest");
    assert.equal(resolveEffectiveTestFramework(undefined, undefined), undefined);
});

void test("resolveCommandTemplateEnvKey maps test and script targets", () => {
    assert.equal(resolveCommandTemplateEnvKey("pytest"), TEST_COMMAND_TEMPLATE_ENV_KEY);
    assert.equal(resolveCommandTemplateEnvKey("unittest"), TEST_COMMAND_TEMPLATE_ENV_KEY);
    assert.equal(resolveCommandTemplateEnvKey(undefined), RUN_COMMAND_TEMPLATE_ENV_KEY);
});

void test("resolveLastUnittestFilter only returns filter for in-file function target", () => {
    assert.equal(
        resolveLastUnittestFilter(
            "TestSuite.test_case",
            "/workspace/src/test_sample.py",
            "/workspace/src/test_sample.py",
        ),
        "TestSuite.test_case",
    );
    assert.equal(
        resolveLastUnittestFilter("", "/workspace/src/test_sample.py", "/workspace/src/test_sample.py"),
        undefined,
    );
    assert.equal(
        resolveLastUnittestFilter(
            "TestSuite.test_case",
            "pkg.tests.TestSuite.test_case",
            "/workspace/src/test_sample.py",
        ),
        undefined,
    );
});

void test("formatDebugStartFailureMessage returns framework-specific text", () => {
    assert.equal(
        formatDebugStartFailureMessage("test_example.py", "pytest"),
        "Failed to start pytest debugging for test_example.py.",
    );
    assert.equal(
        formatDebugStartFailureMessage("test_example.py", "unittest"),
        "Failed to start unittest debugging for test_example.py.",
    );
    assert.equal(
        formatDebugStartFailureMessage("test_example.py", undefined),
        "Failed to start debugging for test_example.py.",
    );
});
