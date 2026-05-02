import assert from "node:assert/strict";
import test from "node:test";

import { buildRunSummaryLine, colorizeRunSummary, formatRuntime } from "../../src/run/runTaskStatusText.js";

void test("formatRuntime renders human-readable minutes and seconds", () => {
    const result = formatRuntime(182000);

    assert.equal(result, "3m 2s");
});

void test("buildRunSummaryLine renders success summary", () => {
    const result = buildRunSummaryLine("hello.py", 0, 182000, null);

    assert.equal(result, "-- Process hello.py succeeded (exit code 0, runtime 3m 2s) --");
});

void test("buildRunSummaryLine renders failure summary with signal", () => {
    const result = buildRunSummaryLine("fail.py", 2, 125000, "SIGTERM");

    assert.equal(result, "-- Process fail.py failed (exit code 2, runtime 2m 5s, signal SIGTERM) --");
});

void test("colorizeRunSummary applies green for success", () => {
    const result = colorizeRunSummary("-- Process hello.py succeeded --", 0);

    assert.equal(result, "\u001b[32m-- Process hello.py succeeded --\u001b[0m");
});

void test("colorizeRunSummary applies red for failure", () => {
    const result = colorizeRunSummary("-- Process fail.py failed --", 1);

    assert.equal(result, "\u001b[31m-- Process fail.py failed --\u001b[0m");
});
