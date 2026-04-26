import type * as vscode from "vscode";

import {
    LAST_TARGET_KEY,
    type LastTargetRecord,
    type PythonTestFramework,
    type ResolvedPythonTarget,
} from "../types.js";
import { isLastTargetRecord } from "./lastTargetRecord.js";

export interface LastTargetExecutionContext {
    testFramework?: PythonTestFramework;
    testFunction?: string;
    testTarget?: string;
}

export class LastTargetStore {
    public constructor(private readonly workspaceState: vscode.Memento) {}

    public get(): LastTargetRecord | undefined {
        const value = this.workspaceState.get<unknown>(LAST_TARGET_KEY);
        return isLastTargetRecord(value) ? value : undefined;
    }

    public async set(target: ResolvedPythonTarget, context: LastTargetExecutionContext = {}): Promise<void> {
        await this.workspaceState.update(LAST_TARGET_KEY, {
            filePath: target.filePath,
            workspaceFolderPath: target.workspaceFolder.uri.fsPath,
            testFramework: context.testFramework,
            testFunction: context.testFunction,
            testTarget: context.testTarget,
        } satisfies LastTargetRecord);
    }

    public async clear(): Promise<void> {
        await this.workspaceState.update(LAST_TARGET_KEY, undefined);
    }
}
