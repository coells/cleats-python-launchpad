import assert from "node:assert/strict";
import test from "node:test";
import type * as vscode from "vscode";

import { resolveLaunchWorkspaceFolder } from "../../src/launch/launchWorkspaceFolder.js";

const folderA = {
    name: "alpha",
    uri: {
        fsPath: "/workspace/alpha",
    },
};

const folderB = {
    name: "beta",
    uri: {
        fsPath: "/workspace/beta",
    },
};

void test("resolveLaunchWorkspaceFolder uses default folder when setting is empty", () => {
    const result = resolveLaunchWorkspaceFolder(
        [folderA, folderB] as unknown as readonly vscode.WorkspaceFolder[],
        folderA as unknown as vscode.WorkspaceFolder,
        "",
    );

    assert.equal(result.didMatchConfiguredFolder, true);
    assert.equal(result.workspaceFolder, folderA);
});

void test("resolveLaunchWorkspaceFolder matches configured workspace name", () => {
    const result = resolveLaunchWorkspaceFolder(
        [folderA, folderB] as unknown as readonly vscode.WorkspaceFolder[],
        folderA as unknown as vscode.WorkspaceFolder,
        "beta",
    );

    assert.equal(result.didMatchConfiguredFolder, true);
    assert.equal(result.workspaceFolder, folderB);
});

void test("resolveLaunchWorkspaceFolder matches configured absolute workspace path", () => {
    const result = resolveLaunchWorkspaceFolder(
        [folderA, folderB] as unknown as readonly vscode.WorkspaceFolder[],
        folderA as unknown as vscode.WorkspaceFolder,
        "/workspace/beta/",
    );

    assert.equal(result.didMatchConfiguredFolder, true);
    assert.equal(result.workspaceFolder, folderB);
});

void test("resolveLaunchWorkspaceFolder falls back to default when setting is unknown", () => {
    const result = resolveLaunchWorkspaceFolder(
        [folderA, folderB] as unknown as readonly vscode.WorkspaceFolder[],
        folderA as unknown as vscode.WorkspaceFolder,
        "missing-folder",
    );

    assert.equal(result.didMatchConfiguredFolder, false);
    assert.equal(result.workspaceFolder, folderA);
});
