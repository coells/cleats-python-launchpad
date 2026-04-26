import * as vscode from "vscode";

const PYTHON_EXTENSION_ID = "ms-python.python";

export async function ensurePythonExtension(): Promise<boolean> {
    const extension = vscode.extensions.getExtension(PYTHON_EXTENSION_ID);
    if (!extension) {
        await vscode.window.showErrorMessage(
            "Cleats: Python Launchpad requires the Microsoft Python extension to debug Python files.",
        );
        return false;
    }

    if (!extension.isActive) {
        await extension.activate();
    }

    return true;
}
