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

const descriptor = {
    fileDirname: "/workspace/python-samples/src",
    filePath: "/workspace/python-samples/src/hello.py",
    workspaceRelativePath: "python-samples/src/hello.py",
};

void test("buildManagedLaunchConfig creates a debugpy launch config", () => {
    const config = buildManagedLaunchConfig(descriptor, "Launchpad");

    assert.equal(config.type, "debugpy");
    assert.equal(config.request, "launch");
    assert.equal(config.program, descriptor.filePath);
    assert.equal(config.cwd, descriptor.fileDirname);
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
        "presentation",
    ]);
    assert.ok(isManagedLaunchConfig(config, "Launchpad"));
});

void test("upsertManagedLaunchConfig replaces only the matching managed config", () => {
    const runTemplateName = getManagedRunTemplateName("Launchpad");
    const existing = [
        {
            name: "User config",
            type: "debugpy",
            request: "launch",
            program: "${file}",
        },
        {
            name: "Launchpad: python-samples/src/hello.py",
            type: "debugpy",
            request: "launch",
            program: "/old/path.py",
            cwd: "/old",
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
                CLEATS_PYTHON_LAUNCHPAD_RUN_COMMAND_TEMPLATE: "python {script}",
            },
            subProcess: true,
            presentation: {
                group: "Launchpad",
                hidden: true,
            },
        },
    ];

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", "uv run python {script}");

    assert.equal(updated.configurations.length, 4);
    assert.equal(updated.runCommandTemplate, "python {script}");
    assert.equal(updated.debugConfig.cwd, "${workspaceFolder}");
    assert.equal(updated.debugConfig.justMyCode, false);
    assert.equal((updated.debugConfig as Record<string, unknown>).subProcess, true);
    assert.deepEqual(updated.debugConfig.presentation, {
        group: "Launchpad",
    });
    assert.deepEqual(Object.keys(updated.debugConfig as Record<string, unknown>), [
        "name",
        "type",
        "request",
        "program",
        "cwd",
        "console",
        "justMyCode",
        "subProcess",
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
        "subProcess",
        "env",
        "presentation",
    ]);
    assert.equal(
        (updatedTemplate.env as Record<string, unknown> | undefined)?.CLEATS_PYTHON_LAUNCHPAD_RUN_COMMAND_TEMPLATE,
        "python {script}",
    );
});

void test("upsertManagedLaunchConfig seeds run template from defaults when missing", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", "uv run python {script}");

    assert.equal(updated.runCommandTemplate, "uv run python {script}");
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
    ) as { env?: Record<string, unknown>; presentation?: Record<string, unknown> };
    assert.equal(runTemplate.env?.CLEATS_PYTHON_LAUNCHPAD_RUN_COMMAND_TEMPLATE, "uv run python {script}");
    assert.deepEqual(runTemplate.presentation, {
        group: "Launchpad",
        hidden: true,
    });
});

void test("getManagedLaunchName shortens long paths while keeping filename readable", () => {
    const longName = getManagedLaunchName(
        {
            ...descriptor,
            workspaceRelativePath: "very/long/path/with/many/segments/and/deep/folder/hello_world_super_long_name.py",
        },
        "Launchpad",
    );

    assert.match(longName, /^Launchpad: /);
    assert.match(longName, /hello_world_super_long_name\.py$/);
    assert.equal(longName.length <= 60, true);
});

void test("upsertManagedLaunchConfig emits managed entries with readable key order", () => {
    const updated = upsertManagedLaunchConfig([], descriptor, "Launchpad", "uv run python {script}");

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
            name: "Launchpad: python-samples/src/hello.py",
            type: "debugpy",
            request: "launch",
            program: "/workspace/python-samples/src/hello.py",
            presentation: {
                group: "Launchpad",
            },
        },
        {
            name: "Launchpad: python-samples/src/fail.py",
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

    const updated = upsertManagedLaunchConfig(existing, descriptor, "Launchpad", "uv run python {script}");
    const names = updated.configurations.map((item) => item.name);

    assert.deepEqual(names, [
        getManagedRunTemplateName("Launchpad"),
        "User first",
        "Launchpad: another.py",
        "User last",
        getManagedLaunchName(descriptor, "Launchpad"),
    ]);
});
