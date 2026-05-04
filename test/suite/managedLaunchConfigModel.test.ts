import assert from "node:assert/strict";
import test from "node:test";

import {
    buildManagedLaunchConfig,
    getManagedLaunchName,
    getManagedRunTemplateName,
    isManagedLaunchConfig,
    removeManagedTargetLaunchConfigs,
    upsertManagedLaunchConfig,
} from "../../src/launch/managedLaunchConfigModel.js";
import {
    RUN_COMMAND_TEMPLATE,
    RUN_COMMAND_TEMPLATE_ENV_KEY,
    TEST_COMMAND_TEMPLATE,
    TEST_COMMAND_TEMPLATE_ENV_KEY,
} from "../../src/run/commandTemplate.js";

const descriptor = {
    filePath: "/workspace/python-samples/src/hello.py",
    workspaceFolderPath: "/workspace",
};

void test("buildManagedLaunchConfig creates a debugpy launch config", () => {
    const config = buildManagedLaunchConfig(descriptor, "Launchpad");

    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.program, descriptor.filePath);
    assert.equal(config.cwd, descriptor.workspaceFolderPath);
    assert.equal((config.env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY], RUN_COMMAND_TEMPLATE);
    assert.equal((config.env as Record<string, unknown>)[TEST_COMMAND_TEMPLATE_ENV_KEY], TEST_COMMAND_TEMPLATE);
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
    const runTemplateName = getManagedRunTemplateName("Launchpad");
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
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "uv run python {script}",
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
        {
            name: runTemplateName,
            type: "debugpy",
            request: "launch",
            program: "${file}",
            cwd: "${workspaceFolder}",
            justMyCode: false,
            env: {
                PYTHONPATH: "/workspace/src",
            },
            subProcess: true,
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad");

    assert.equal(updated.configurations.length, 4);
    assert.equal(updated.debugConfig.program, descriptor.filePath);
    assert.equal(updated.debugConfig.cwd, "/old");
    assert.equal(updated.debugConfig.justMyCode, false);
    assert.equal((updated.debugConfig as Record<string, unknown>).subProcess, true);
    assert.equal(
        ((updated.debugConfig as Record<string, unknown>).env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY],
        "uv run python {script}",
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
    assert.equal(updated.configurations.filter((item: unknown) => isManagedLaunchConfig(item, "Launchpad")).length, 3);
    assert.ok(
        updated.configurations.some(
            (item: unknown) => item && typeof item === "object" && (item as { name?: string }).name === "User config",
        ),
    );
    assert.ok(
        updated.configurations.some(
            (item: unknown) =>
                item && typeof item === "object" && (item as { program?: string }).program === descriptor.filePath,
        ),
    );

    const updatedTemplate = updated.configurations.find(
        (item: unknown) => item && typeof item === "object" && (item as { name?: string }).name === runTemplateName,
    ) as Record<string, unknown>;
    assert.equal(updatedTemplate.subProcess, true);
    assert.deepEqual(updatedTemplate.presentation, {
        group: "Launchpad",
        hidden: true,
    });
    assert.deepEqual(Object.keys(updatedTemplate), [
        "name",
        "type",
        "request",
        "program",
        "cwd",
        "justMyCode",
        "env",
        "subProcess",
        "presentation",
    ]);
    assert.equal((updatedTemplate.env as Record<string, unknown> | undefined)?.PYTHONPATH, "/workspace/src");
    assert.equal((updatedTemplate.env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY], undefined);
    assert.equal((updatedTemplate.env as Record<string, unknown>)[TEST_COMMAND_TEMPLATE_ENV_KEY], undefined);
});

void test("upsertManagedLaunchConfig creates managed template when missing", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad");

    assert.ok(
        updated.configurations.some(
            (item: unknown) =>
                item &&
                typeof item === "object" &&
                (item as { name?: string }).name === getManagedRunTemplateName("Launchpad"),
        ),
    );

    const runTemplate = updated.configurations.find(
        (item: unknown) =>
            item &&
            typeof item === "object" &&
            (item as { name?: string }).name === getManagedRunTemplateName("Launchpad"),
    ) as { presentation?: Record<string, unknown> };
    assert.deepEqual(runTemplate.presentation, {
        group: "Launchpad",
        hidden: true,
    });
    assert.equal(
        ((runTemplate as Record<string, unknown>).env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY],
        RUN_COMMAND_TEMPLATE,
    );
    assert.equal(
        ((runTemplate as Record<string, unknown>).env as Record<string, unknown>)[TEST_COMMAND_TEMPLATE_ENV_KEY],
        TEST_COMMAND_TEMPLATE,
    );
});

void test("upsertManagedLaunchConfig copies only run command template env key for script targets", () => {
    const existing = [
        {
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            cwd: "${workspaceFolder}",
            env: {
                PYTHONPATH: "/workspace/src",
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "uv run python {script}",
                [TEST_COMMAND_TEMPLATE_ENV_KEY]: "uv run pytest {testTarget}",
            },
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", 10, RUN_COMMAND_TEMPLATE_ENV_KEY);
    const debugEnv = (updated.debugConfig.env as Record<string, unknown>) ?? {};

    assert.equal(debugEnv.PYTHONPATH, "/workspace/src");
    assert.equal(debugEnv[RUN_COMMAND_TEMPLATE_ENV_KEY], "uv run python {script}");
    assert.equal(debugEnv[TEST_COMMAND_TEMPLATE_ENV_KEY], undefined);
});

void test("upsertManagedLaunchConfig copies only test command template env key for test targets", () => {
    const existing = [
        {
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            cwd: "${workspaceFolder}",
            env: {
                PYTHONPATH: "/workspace/src",
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "uv run python {script}",
                [TEST_COMMAND_TEMPLATE_ENV_KEY]: "uv run pytest {testTarget}",
            },
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", 10, TEST_COMMAND_TEMPLATE_ENV_KEY);
    const debugEnv = (updated.debugConfig.env as Record<string, unknown>) ?? {};

    assert.equal(debugEnv.PYTHONPATH, "/workspace/src");
    assert.equal(debugEnv[RUN_COMMAND_TEMPLATE_ENV_KEY], undefined);
    assert.equal(debugEnv[TEST_COMMAND_TEMPLATE_ENV_KEY], "uv run pytest {testTarget}");
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
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad");

    const runTemplate = updated.configurations.find(
        (item: unknown) =>
            item &&
            typeof item === "object" &&
            (item as { name?: string }).name === getManagedRunTemplateName("Launchpad"),
    ) as Record<string, unknown>;

    assert.deepEqual(Object.keys(runTemplate), [
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
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
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
    assert.equal(result.configurations.length, 2);
    assert.ok(result.configurations.some((item) => item.name === "User config"));
    assert.ok(result.configurations.some((item) => item.name === getManagedRunTemplateName("Launchpad")));
});

void test("upsertManagedLaunchConfig appends target configuration at the end", () => {
    const existing = [
        {
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
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

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad");
    const names = updated.configurations.map((item) => item.name);

    assert.deepEqual(names, [
        getManagedRunTemplateName("Launchpad"),
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
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
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

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad");
    const names = updated.configurations.map((item) => item.name);

    assert.deepEqual(names, [getManagedRunTemplateName("Launchpad"), "User first", existingName, "User last"]);
});

void test("upsertManagedLaunchConfig keeps existing target unchanged by default", () => {
    const existingName = getManagedLaunchName(descriptor, "Launchpad");
    const existing = [
        {
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
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

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", 10);

    assert.equal(updated.configurations.length, 2);
    assert.equal(updated.debugConfig.program, descriptor.filePath);
    assert.equal(updated.debugConfig.cwd, "/workspace/custom-cwd");
});

void test("upsertManagedLaunchConfig reuses legacy-named target when program path matches", () => {
    const existing = [
        {
            name: "Launchpad: src/hello.py",
            type: "debugpy",
            request: "launch",
            program: descriptor.filePath,
            env: {
                [RUN_COMMAND_TEMPLATE_ENV_KEY]: "uv run python {script}",
            },
            presentation: {
                group: "Launchpad",
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad");

    assert.equal(updated.configurations.length, 2);
    assert.equal(updated.debugConfig.name, "Launchpad: src/hello.py");
    assert.equal(
        (updated.debugConfig.env as Record<string, unknown>)[RUN_COMMAND_TEMPLATE_ENV_KEY] as string,
        "uv run python {script}",
    );
});

void test("upsertManagedLaunchConfig trims oldest managed targets when limit is exceeded", () => {
    const existing = [
        {
            name: getManagedRunTemplateName("Launchpad"),
            type: "debugpy",
            request: "launch",
            program: "${file}",
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
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

    const updated = upsertManagedLaunchConfig(existing, nextDescriptor, "Launchpad", 2);
    const names = updated.configurations.map((item) => item.name);

    assert.equal(names.includes("Launchpad: test_a.py"), false);
    assert.deepEqual(names, [
        getManagedRunTemplateName("Launchpad"),
        "Launchpad: test_b.py",
        getManagedLaunchName(nextDescriptor, "Launchpad"),
    ]);
});
