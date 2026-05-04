import { spawn } from "node:child_process";

import { buildRunSummaryLine, colorizeRunSummary } from "./runTaskStatusText.js";

function readArgs(): { commandLine: string; processLabel: string } {
    const processLabel = process.argv[2];
    const commandLine = process.argv[3];

    if (!processLabel || !commandLine) {
        throw new Error("Expected process label and command line arguments.");
    }

    return {
        commandLine,
        processLabel,
    };
}

function printSummary(processLabel: string, exitCode: number, startedAt: number, signal: string | null): void {
    const summary = buildRunSummaryLine(processLabel, exitCode, Date.now() - startedAt, signal);
    process.stdout.write(`\n${colorizeRunSummary(summary, exitCode)}\n`);
}

function run(): void {
    let processLabel = "python-script";
    let startedAt = Date.now();

    try {
        const args = readArgs();
        processLabel = args.processLabel;
        startedAt = Date.now();

        process.stdout.write(`[Cleats] cwd: ${process.cwd()}\n`);
        process.stdout.write(`[Cleats] command: ${args.commandLine}\n\n`);

        const child = spawn(args.commandLine, {
            cwd: process.cwd(),
            shell: true,
            stdio: "inherit",
        });

        child.on("error", (error) => {
            const exitCode = 1;
            printSummary(processLabel, exitCode, startedAt, null);
            process.stderr.write(`${error.message}\n`);
            process.exit(exitCode);
        });

        child.on("exit", (code, signal) => {
            const exitCode = typeof code === "number" ? code : 1;
            printSummary(processLabel, exitCode, startedAt, signal);
            process.exit(exitCode);
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const exitCode = 1;
        printSummary(processLabel, exitCode, startedAt, null);
        process.stderr.write(`${message}\n`);
        process.exit(exitCode);
    }
}

run();
