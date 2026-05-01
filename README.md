# Cleats: Python Launchpad

Run and debug the current or last Python file in VS Code with minimal setup.

This extension keeps run/debug flows fast while preserving deterministic launch configuration behavior.

## Why It Exists

Opening Python scripts quickly is easy, but consistent run/debug ergonomics across files and workspaces often drift. Cleats: Python Launchpad keeps the workflow predictable and lightweight.

## Behavior

- Provides five commands:
  - Run Current File
  - Debug Current File
  - Run Last File
  - Debug Last File
  - Remove Managed Target Configurations
- Depends on the Microsoft Python extension (`ms-python.python`) for Python debugging support.
- Persists the last valid Python target per workspace.
- Persists the last valid Python execution target details per workspace, including test-node selection when applicable.
- Generates run commands from a managed launch.json template entry that you can customize.
- Auto-detects test files (`test*.py`, `*_test.py`) and routes them to pytest or unittest using Python extension test settings.
- In test files, `Run Current File` runs only the current function or method when the cursor is inside one, otherwise the whole module target.
- In test files, `Debug Current File` debugs only the current function or method when the cursor is inside one, otherwise the whole module target.
- Prints a terminal summary tail after each run with outcome, exit code, and runtime (green for success, red for failure).
- Creates and updates only extension-managed debug configurations.
- Preserves user-managed launch configurations untouched.

## Default Keybindings

Default shortcuts use Ctrl key combinations on all platforms:

- Debug Current File: `Ctrl+Shift+F9`
- Run Current File: `Ctrl+Shift+F10`
- Debug Last File: `Ctrl+F9`
- Run Last File: `Ctrl+F10`

## Validation Rules

Targets are accepted only when:

- an active editor exists,
- the file is saved,
- the file is Python,
- the file is inside an open workspace folder.

## Settings

- `cleatsPythonLaunchpad.runCommandTemplate`
  - Default: `uv run python {script}`
  - Used as the default value for the managed script run template in `launch.json`.
- `cleatsPythonLaunchpad.pytestCommandTemplate`
  - Default: `uv run pytest {pytestTarget}`
  - Used for test files when pytest is configured in Python extension test settings.
- `cleatsPythonLaunchpad.unittestCommandTemplate`
  - Default: `uv run python -m unittest {testTarget}`
  - Used for test files when unittest is configured in Python extension test settings.
- `cleatsPythonLaunchpad.generatedLaunchNamePrefix`
  - Default: `Launchpad`
- `cleatsPythonLaunchpad.launchWorkspaceFolder`
  - Default: empty string
  - Optional workspace folder name or absolute path that selects which workspace folder `launch.json` Cleats manages in multi-root workspaces.
  - If empty, Cleats uses the target Python file's workspace folder.
- `cleatsPythonLaunchpad.runOpenNewTerminalIfBusy`
  - Default: `true`
  - If `true`, run commands open a new terminal when a previous Cleats run is still active.
- `cleatsPythonLaunchpad.terminalReveal`
  - Allowed values: `always`, `silent`, `never`

Supported placeholders for `runCommandTemplate`, `pytestCommandTemplate`, and `unittestCommandTemplate`:

- `{script}`
- `{workspaceFolder}`
- `{fileDirname}`
- `{fileBasename}`
- `{testTarget}`
- `{testFunction}`
- `{pytestTarget}`
- `{pytestFunction}`

## Managed launch.json entries

When you run or debug with Cleats, the extension manages two launch entries under your configured prefix:

- `...: Template`
  - Stores `runCommandTemplate` for the workspace folder.
  - You can edit this template directly in `launch.json` and subsequent run commands use it.
  - Managed template identity is based on:
    - `name: "<prefix>: Template"`
    - `presentation: { "group": "<prefix>", "hidden": true }`
- `...: <workspace-relative-python-file>`
  - Target-specific debug configuration.
  - Managed target identity is based on:
    - `name: "<prefix>: <workspace-relative-python-file>"`
    - `presentation: { "group": "<prefix>" }`

Use `Remove Managed Target Configurations` to delete all managed target entries while preserving user-defined entries and the managed template entry.

## Release History

### 0.1.1 (2026-05-01)

- Added terminal-tail run summaries, including exit code and runtime for every run.
- Added ANSI coloring for terminal-tail summaries (green success, red failure).
- Removed status bar run lifecycle messages in favor of terminal-native completion output.
- Tightened VSIX packaging via `.vscodeignore` to keep publish artifacts runtime-focused.

### 0.1.0 (2026-04-25)

- Initial release candidate for Cleats: Python Launchpad.
- Added run/debug commands for current and last Python file targets.
- Added managed debug configuration generation and update flow.
- Added unit tests for command template expansion and launch config handling.
- Added a resized extension icon asset for Marketplace/package metadata.
- Updated development docs for release metadata checks.
