import type { LastTargetRecord } from "../types.js";

export function isLastTargetRecord(value: unknown): value is LastTargetRecord {
    if (!value || typeof value !== "object") {
        return false;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.filePath !== "string" || typeof record.workspaceFolderPath !== "string") {
        return false;
    }

    if (
        record.testFramework !== undefined &&
        record.testFramework !== "pytest" &&
        record.testFramework !== "unittest"
    ) {
        return false;
    }

    if (record.testFunction !== undefined && typeof record.testFunction !== "string") {
        return false;
    }

    if (record.testTarget !== undefined && typeof record.testTarget !== "string") {
        return false;
    }

    return true;
}
