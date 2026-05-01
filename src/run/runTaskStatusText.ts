const GREEN = "\u001b[32m";
const RED = "\u001b[31m";
const RESET = "\u001b[0m";

export function formatRuntime(elapsedMilliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}m${seconds.toString().padStart(2, "0")}s`;
}

export function buildRunSummaryLine(
    processLabel: string,
    exitCode: number,
    elapsedMilliseconds: number,
    signal: string | null,
): string {
    const outcome = exitCode === 0 ? "succeeded" : "failed";
    const signalSuffix = signal ? `, signal ${signal}` : "";

    return `-- Process ${processLabel} ${outcome} (exit code ${exitCode}, runtime ${formatRuntime(elapsedMilliseconds)}${signalSuffix}) --`;
}

export function colorizeRunSummary(summaryLine: string, exitCode: number): string {
    const color = exitCode === 0 ? GREEN : RED;
    return `${color}${summaryLine}${RESET}`;
}
