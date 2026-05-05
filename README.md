# Cleats: Python Launchpad

Run and debug the current or last Python file in VS Code with minimal setup.

This extension keeps run/debug flows fast while preserving deterministic launch configuration behavior.

## Why It Exists

Running and debugging Python files in VSCode quickly is inconvenient. Let's fix that.

- Ctrl+Shift+F10 creates a launch configuration for the current script and runs it -- quick and easy.
- Ctrl+F10 runs the last configuration again -- fast re-run.
- Ctrl+Shift+F9 and Ctrl+F9 do the same for debugging -- debug with the same ease.
- Run and debug multiple scripts simultaneously -- no more "A debug session is already active" errors.
- Launchpad manages per-file launch configurations with predictable defaults and settings-based overrides.

## Behavior

### First-Run Setup

- When enabled and no managed target exists, first execution opens a setup flow in this order: run command template, current working directory, and launch target selection in multi-root workspaces.

### Usage

1. Open a Python file, be it a script or a test file.
2. Press `Ctrl+Shift+F10` to run it, or `Ctrl+Shift+F9` to debug it.
3. Use `Ctrl+F10` / `Ctrl+F9` to run or debug the last valid Python target, even when editor focus is elsewhere.
4. On first run/debug of a target, Launchpad opens a setup dialog (can be disabled) before creating managed launch entries.
5. The setup dialog asks in order: run command template, current working directory, and launch target workspace folder (multi-root only).
6. Subsequent runs/debugs reuse existing managed target entries without showing the setup dialog.

### Commands

- Run Current File
- Debug Current File
- Run Last File
- Debug Last File
- Remove Managed Target Configurations

### Default Keybindings

Default shortcuts use Ctrl key combinations on all platforms:

- Debug Current File: `Ctrl+Shift+F9`
- Run Current File: `Ctrl+Shift+F10`
- Debug Last File: `Ctrl+F9`
- Run Last File: `Ctrl+F10`

### Target Resolution

- Depends on the Microsoft Python extension (`ms-python.python`) for Python debugging support.
- Auto-detects test files by filename (`test*.py`, `*_test.py`).
- In test files, `Run/Debug Current File` resolves the current function or method when the cursor is inside one; otherwise, it targets the whole file.
- `Run Last File` and `Debug Last File` are no-ops when no previous target exists.

### Run and Debug Execution

- Run/debug commands resolve runtime templates from managed launch env keys (`PYTHON_LAUNCHPAD_RUN_COMMAND` / `PYTHON_LAUNCHPAD_TEST_COMMAND`) with safe fallbacks.
- Debug commands choose pytest or unittest based on Python test settings (`python.testing.pytestEnabled` / `python.testing.unittestEnabled`).
- `Debug Current File` and `Debug Last File` launch by managed configuration name for script targets, so the Run and Debug panel keeps the selected Launchpad target for `F5` reuse.
- Prints a terminal summary tail after each run with outcome, exit code, and runtime (green for success, red for failure).

### Managed Configuration Rules

- Creates and updates only extension-managed debug configurations.
- Existing managed target configurations are never overwritten once created.
- User-managed launch configurations remain untouched.

### Settings

Command template settings:

- `cleatsPythonLaunchpad.runCommandTemplate`
  - Default: `python {script}`
  - Used for script targets and written to `PYTHON_LAUNCHPAD_RUN_COMMAND` when creating a managed target.
- `cleatsPythonLaunchpad.testCommandTemplate`
  - Default: `python -m pytest {testTarget}`
  - Used for test targets and written to `PYTHON_LAUNCHPAD_TEST_COMMAND` when creating a managed target.

- `cleatsPythonLaunchpad.generatedLaunchNamePrefix`
  - Default: `Launchpad`
- `cleatsPythonLaunchpad.launchJsonPath`
  - Default: empty string
  - Optional path that selects which `launch.json` Cleats manages in multi-root workspaces.
  - Supports absolute file path to `launch.json` or a folder path (mapped to `<folder>/.vscode/launch.json`).
  - If empty, Cleats uses the target Python file's workspace folder.
- `cleatsPythonLaunchpad.managedTargetConfigurationLimit`
  - Default: `20`
  - Limits managed Launchpad target entries per workspace-folder `launch.json`.
  - If creating a new managed target exceeds the limit, the least-recent managed target (first in order) is removed.
  - Existing targets keep their order when run/debugged again.
- `cleatsPythonLaunchpad.launchConfigurationTemplate`
  - Default: `{}`
  - JSON object applied as a base override for newly created managed target launch configurations.
  - Use it to define defaults (for example `justMyCode`, `subProcess`, `env`, `envFile`) without editing managed launch entries manually.
- `cleatsPythonLaunchpad.executeDialogEnabled`
  - Default: `true`
  - If `true`, first execution of an unmanaged target shows a setup dialog before the managed target configuration is created.
  - Dialog customization order: run command template, current working directory, then launch target workspace folder (multi-root only).
- `cleatsPythonLaunchpad.runOpenNewTerminalIfBusy`
  - Default: `true`
  - If `true`, run commands open a new terminal when a previous Cleats run is still active.
- `cleatsPythonLaunchpad.debugOpenNewTerminalIfBusy`
  - Default: `true`
  - If `true`, debug commands can launch an additional debug session when a matching target is already active.
- `cleatsPythonLaunchpad.terminalReveal`
  - Allowed values: `always`, `silent`, `never`

## Managed launch.json entries

When you run or debug with Cleats, the extension manages per-file launch entries under your configured prefix:

- `...: <python-file-name>`
  - Target-specific debug configuration.
  - Inherits defaults from `cleatsPythonLaunchpad.launchConfigurationTemplate` when first created.
  - Run commands also apply target `env` and `envFile` values.
  - Stores either `PYTHON_LAUNCHPAD_RUN_COMMAND` or `PYTHON_LAUNCHPAD_TEST_COMMAND` in `env` based on the target type.
  - Managed-name format is strict: `<prefix>: <python-file-name>` with optional numeric suffix (`(2)`, `(3)`, ...).
  - If the base managed name is already used by a different target, Cleats creates a unique suffixed name (for example `(2)`).
  - Managed target identity is based on:
    - `name: "<prefix>: <python-file-name>"`
    - `presentation: { "group": "<prefix>" }`

Use `Remove Managed Target Configurations` to delete all managed target entries while preserving user-defined entries.

## Release History

### 0.1.4 (2026-05-14)

- Added dialog support for first-run execution of scripts.
- Improved configuration settings.
- Bug fixes and internal refactors.
- Drop legacy behavior.

### 0.1.3 (2026-05-04)

- Switched run/test command templates from user settings to fixed internal templates.
- Added managed template env keys `PYTHON_LAUNCHPAD_RUN_COMMAND` and `PYTHON_LAUNCHPAD_TEST_COMMAND`.
- Updated run/debug flows to resolve execution commands from managed target `env` values with safe fallbacks.
- And much more...

### 0.1.2 (2026-05-02)

- Consolidated command templates for running scripts, pytest, and unittest into a single testCommandTemplate.
- Updated function signatures and internal logic in runCurrentFile and runLastFile to accommodate the new testCommandTemplate.
- Introduced a new debugBusyTerminal module to manage debug session states and terminal behavior.
- And much more...

### 0.1.1 (2026-05-01)

- Added terminal-tail run summaries, including exit code and runtime for every run.
- Added ANSI coloring for terminal-tail summaries (green success, red failure).
- Tightened VSIX packaging via `.vscodeignore` to keep publish artifacts runtime-focused.

### 0.1.0 (2026-04-25)

- Initial release candidate for Cleats: Python Launchpad.
- Added run/debug commands for current and last Python file targets.
- Updated development docs for release metadata checks.
