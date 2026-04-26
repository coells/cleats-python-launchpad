const TEST_FILE_PATTERN = /(^test.*\.py$|.*_test\.py$)/;

export function isTestFile(fileBasename: string): boolean {
    return TEST_FILE_PATTERN.test(fileBasename);
}
