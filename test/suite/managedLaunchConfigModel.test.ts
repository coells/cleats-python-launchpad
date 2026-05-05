import assert from "node:assert/strict";
import test from "node:test";

import {
    buildManagedLaunchConfig,
    getManagedLaunchName,
    isManagedLaunchConfig,
    removeManagedTargetLaunchConfigs,
    upsertManagedLaunchConfig,
} from "../../src/launch/managedLaunchConfigModel.js";
import {
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
} from "../../src/run/commandTemplate.js";

const descriptor = {
    filePath: "/workspace/python-samples/src/hello.py",
    workspaceFolderPath: "/workspace",
    workspaceFolderName: "python-samples",
};

void test("buildManagedLaunchConfig creates a debugpy launch config", () => {
    const config = buildManagedLaunchConfig(descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);

    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.program, descriptor.filePath);
    assert.equal(config.cwd, "${workspaceFolder:python-samples}");
    assert.equal((config.env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY], RUN_COMMAND_TEMPLATE);
    assert.equal((config.env as Record<string, unknown>)[TEST_COMMAND_TEMPLATE_ENV_KEY], undefined);
    assert.equal(config.name, getManagedLaunchName(descriptor, "Launchpad"));
    assert.deepEqual(config.presentation, {
        group: "Launchpad",
    });
    assert.deepEqual(Object.keys(config as Record<string, unknown>), [
        "name",
        "type",
        "request",
        "program",
        "cwd",
        "console",
        "justMyCode",
        "env",
        "presentation",
    ]);
    assert.ok(isManagedLaunchConfig(config, "Launchpad"));
});

void test("upsertManagedLaunchConfig keeps an existing matching managed config unchanged", () => {
    const existing = [
        {
            name: "User config",
            type: "debugpy",
            request: "launch",
            program: "${file}",
        },
        {
            name: "Launchpad: hello.py",
            type: "debugpy",
            request: "launch",
            program: descriptor.filePath,
            cwd: "/old",
            justMyCode: false,
            subProcess: true,
            env: {
                PYTHONPATH: "/workspace/src",
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "python {script}",
            },
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "Launchpad: another.py",
            type: "debugpy",
            request: "launch",
            program: "/other.py",
            cwd: "/other",
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);

    assert.equal(updated.configurations.length, 3);
    assert.equal(updated.debugConfig.program, descriptor.filePath);
    assert.equal(updated.debugConfig.cwd, "/old");
    assert.equal(updated.debugConfig.justMyCode, false);
    assert.equal((updated.debugConfig as Record<string, unknown>).subProcess, true);
    assert.equal(
        ((updated.debugConfig as Record<string, unknown>).env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY],
        "python {script}",
    );
    assert.deepEqual(updated.debugConfig.presentation, {
        group: "Launchpad",
    });
    assert.deepEqual(Object.keys(updated.debugConfig as Record<string, unknown>), [
        "name",
        "type",
        "request",
        "program",
        "cwd",
        "justMyCode",
        "subProcess",
        "env",
        "presentation",
    ]);
    assert.equal(updated.configurations.filter((item: unknown) => isManagedLaunchConfig(item, "Launchpad")).length, 2);
});

void test("upsertManagedLaunchConfig applies settings-based launch template overrides", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY, 10, {
        justMyCode: false,
        subProcess: true,
        env: {
            PYTHONPATH: "/workspace/src",
            [RUN_COMMAND_TEMPLATE_ENV_KEY]: "python {script}",
        },
    });

    assert.equal(updated.configurations.length, 1);
    assert.equal(updated.configurations[0].name, "Launchpad: hello.py");
    assert.equal(updated.debugConfig.justMyCode, false);
    assert.equal((updated.debugConfig as Record<string, unknown>).subProcess, true);
    const debugEnv = (updated.debugConfig.env as Record<string, unknown>) ?? {};
    assert.equal(debugEnv.PYTHONPATH, "/workspace/src");
    assert.equal(debugEnv[RUN_COMMAND_TEMPLATE_ENV_KEY], "python {script}");
    assert.equal(debugEnv[TEST_COMMAND_TEMPLATE_ENV_KEY], undefined);
});

void test("upsertManagedLaunchConfig copies only run command template env key for script targets", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY, 10, {
        env: {
            PYTHONPATH: "/workspace/src",
            [RUN_COMMAND_TEMPLATE_ENV_KEY]: "python {script}",
            [TEST_COMMAND_TEMPLATE_ENV_KEY]: "pytest {testTarget}",
        },
    });
    const debugEnv = (updated.debugConfig.env as Record<string, unknown>) ?? {};

    assert.equal(debugEnv.PYTHONPATH, "/workspace/src");
    assert.equal(debugEnv[RUN_COMMAND_TEMPLATE_ENV_KEY], "python {script}");
    assert.equal(debugEnv[TEST_COMMAND_TEMPLATE_ENV_KEY], undefined);
});

void test("upsertManagedLaunchConfig copies only test command template env key for test targets", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", TEST_COMMAND_TEMPLATE_ENV_KEY, 10, {
        env: {
            PYTHONPATH: "/workspace/src",
            [RUN_COMMAND_TEMPLATE_ENV_KEY]: "python {script}",
            [TEST_COMMAND_TEMPLATE_ENV_KEY]: "pytest {testTarget}",
        },
    });
    const debugEnv = (updated.debugConfig.env as Record<string, unknown>) ?? {};

    assert.equal(debugEnv.PYTHONPATH, "/workspace/src");
    assert.equal(debugEnv[RUN_COMMAND_TEMPLATE_ENV_KEY], undefined);
    assert.equal(debugEnv[TEST_COMMAND_TEMPLATE_ENV_KEY], "pytest {testTarget}");
});

void test("getManagedLaunchName uses only the target filename", () => {
    const longName = getManagedLaunchName(
        {
            ...descriptor,
            filePath: "/workspace/very/long/path/with/many/segments/and/deep/folder/hello_world_super_long_name.py",
        },
        "Launchpad",
    );

    assert.equal(longName, "Launchpad: hello_world_super_long_name.py");
});

void test("upsertManagedLaunchConfig emits managed entries with readable key order", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);

    assert.deepEqual(Object.keys(updated.debugConfig as Record<string, unknown>), [
        "name",
        "type",
        "request",
        "program",
        "cwd",
        "console",
        "justMyCode",
        "env",
        "presentation",
    ]);
});

void test("removeManagedTargetLaunchConfigs removes only managed target entries", () => {
    const existing = [
        {
            name: "User config",
            type: "debugpy",
            request: "launch",
            program: "${file}",
        },
        {
            name: "Launchpad: hello.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/python-samples/src/hello.py",
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "Launchpad: fail.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/python-samples/src/fail.py",
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const result = removeManagedTargetLaunchConfigs(existing, "Launchpad");

    assert.equal(result.removedCount, 2);
    assert.equal(result.configurations.length, 1);
    assert.equal(result.configurations[0].name, "User config");
});

void test("upsertManagedLaunchConfig appends target configuration at the end", () => {
    const existing = [
        {
            name: "User first",
            type: "debugpy",
            request: "launch",
            program: "${file}",
        },
        {
            name: "Launchpad: another.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/python-samples/src/another.py",
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "User last",
            type: "debugpy",
            request: "launch",
            program: "${workspaceFolder}/app.py",
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);
    const names = updated.configurations.map((item) => item.name);

    assert.deepEqual(names, [
        "User first",
        "Launchpad: another.py",
        "User last",
        getManagedLaunchName(descriptor, "Launchpad"),
    ]);
});

void test("upsertManagedLaunchConfig keeps existing target position when re-running same target", () => {
    const existingName = getManagedLaunchName(descriptor, "Launchpad");
    const existing = [
        {
            name: "User first",
            type: "debugpy",
            request: "launch",
            program: "${file}",
        },
        {
            name: existingName,
            type: "debugpy",
            request: "launch",
            program: descriptor.filePath,
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "User last",
            type: "debugpy",
            request: "launch",
            program: "${workspaceFolder}/app.py",
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);
    const names = updated.configurations.map((item) => item.name);

    assert.deepEqual(names, ["User first", existingName, "User last"]);
});

void test("upsertManagedLaunchConfig keeps existing target unchanged by default", () => {
    const existingName = getManagedLaunchName(descriptor, "Launchpad");
    const existing = [
        {
            name: existingName,
            type: "debugpy",
            request: "launch",
            program: descriptor.filePath,
            cwd: "/workspace/custom-cwd",
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY, 10);

    assert.equal(updated.configurations.length, 1);
    assert.equal(updated.debugConfig.program, descriptor.filePath);
    assert.equal(updated.debugConfig.cwd, "/workspace/custom-cwd");
});

void test("upsertManagedLaunchConfig ignores legacy path-style managed names", () => {
    const existing = [
        {
            name: "Launchpad: src/hello.py",
            type: "debugpy",
            request: "launch",
            program: descriptor.filePath,
            env: {
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "python {script}",
            },
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);

    assert.equal(updated.configurations.length, 2);
    assert.equal(updated.debugConfig.name, getManagedLaunchName(descriptor, "Launchpad"));
    assert.equal(updated.configurations[0].name, "Launchpad: src/hello.py");
});

void test("upsertManagedLaunchConfig adds suffix when base managed name is already used by another target", () => {
    const existing = [
        {
            name: "Launchpad: hello.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/other/hello.py",
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY);

    assert.equal(updated.configurations.length, 2);
    assert.equal(updated.debugConfig.name, "Launchpad: hello.py (2)");
});

void test("upsertManagedLaunchConfig trims oldest managed targets when limit is exceeded", () => {
    const existing = [
        {
            name: "Launchpad: test_a.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/tests/test_a.py",
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "Launchpad: test_b.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/tests/test_b.py",
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const nextDescriptor = {
        ...descriptor,
        filePath: "/workspace/tests/test_c.py",
    };

    const updated = upsertManagedLaunchConfig(existing, nextDescriptor, "Launchpad", RUN_COMMAND_TEMPLATE_ENV_KEY, 2);
    const names = updated.configurations.map((item) => item.name);

    assert.equal(names.includes("Launchpad: test_a.py"), false);
    assert.deepEqual(names, ["Launchpad: test_b.py", getManagedLaunchName(nextDescriptor, "Launchpad")]);
});
