# Cleats: Python Launchpad

Run and debug the current or last Python file in VS Code with minimal setup.

This extension keeps run/debug flows fast while preserving deterministic launch configuration behavior.

## Why It Exists

Running and debugging Python files in VSCode quickly is inconvenient. Let's fix that.

- Ctrl+Shift+F10 creates a launch configuration for the current script and runs it -- quick and easy.
- Ctrl+F10 runs the last configuration again -- fast re-run.
- Ctrl+Shift+F9 and Ctrl+F9 do the same for debugging -- debug with the same ease.
- Run and debug multiple scripts simultaneously -- no more "A debug session is already active" errors.
- Launchpad creates a `Template` configuration that allows for easy customization of launch options.

## Behavior

- Depends on the Microsoft Python extension (`ms-python.python`) for Python debugging support.
- Auto-detects test files (`test*.py`, `*_test.py`) and routes them to pytest or unittest using Python extension test settings.
- In test files, `Run/Debug Current File` runs/debugs only the current function or method when the cursor is inside one, otherwise the whole module target.
- Prints a terminal summary tail after each run with outcome, exit code, and runtime (green for success, red for failure).
- Creates and updates only extension-managed debug configurations while existing managed target configurations are never overwritten once created.
- Preserves user-managed launch configurations untouched.

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

### Settings

Built-in command templates are fixed in code:

- run: `python {script}`
- test: `python -m pytest {testTarget}`

These templates are also written into managed launch configuration environment variables:

- `PYTHON_LAUNCHPAD_RUN_COMMAND`
- `PYTHON_LAUNCHPAD_TEST_COMMAND`

- `cleatsPythonLaunchpad.generatedLaunchNamePrefix`
  - Default: `Launchpad`
- `cleatsPythonLaunchpad.launchJsonPath`
  - Default: empty string
  - Optional path that selects which `launch.json` Cleats manages in multi-root workspaces.
  - Supports absolute file path to `launch.json` or a folder path (mapped to `<folder>/.vscode/launch.json`).
  - If empty, Cleats uses the target Python file's workspace folder.
- `cleatsPythonLaunchpad.managedTargetConfigurationLimit`
  - Default: `10`
  - Limits managed Launchpad target entries per workspace-folder `launch.json`.
  - If creating a new managed target exceeds the limit, the least-recent managed target (first in order) is removed.
  - Existing targets keep their order when run/debugged again.
- `cleatsPythonLaunchpad.runOpenNewTerminalIfBusy`
  - Default: `true`
  - If `true`, run commands open a new terminal when a previous Cleats run is still active.
- `cleatsPythonLaunchpad.debugOpenNewTerminalIfBusy`
  - Default: `true`
  - If `true`, debug commands can launch an additional debug session when a matching target is already active.
- `cleatsPythonLaunchpad.terminalReveal`
  - Allowed values: `always`, `silent`, `never`

## Managed launch.json entries

When you run or debug with Cleats, the extension manages two launch entries under your configured prefix:

- `...: Template`
  - Provides the base launch/debug options that managed target entries inherit.
  - Includes `PYTHON_LAUNCHPAD_RUN_COMMAND` and `PYTHON_LAUNCHPAD_TEST_COMMAND` in `env`.
  - Managed template identity is based on:
    - `name: "<prefix>: Template"`
    - `presentation: { "group": "<prefix>", "hidden": true }`
- `...: <python-file-name>`
  - Target-specific debug configuration.
  - Inherits the managed template `env` values.
  - Run commands also apply target `env` and `envFile` values.
  - Managed target identity is based on:
    - `name: "<prefix>: <python-file-name>"`
    - `presentation: { "group": "<prefix>" }`

Use `Remove Managed Target Configurations` to delete all managed target entries while preserving user-defined entries and the managed template entry.

## Release History

### 0.1.3 (2026-05-04)

- Switched run/test command templates from user settings to fixed internal templates.
- Added managed template env keys `PYTHON_LAUNCHPAD_RUN_COMMAND` and `PYTHON_LAUNCHPAD_TEST_COMMAND`.
- Updated run/debug flows to resolve execution commands from managed target `env` values with safe fallbacks.
- Changed managed target creation to copy only the relevant command template env key (run vs test) while preserving other env entries.
- Kept existing managed target configurations intact on rerun/debug, including legacy-name reuse when the program path matches.
- Changed managed target naming to use filename-only format (`<prefix>: <python-file-name>`).
- Standardized default cwd behavior to workspace root for run tasks and pytest/unittest debug configs.
- Removed `runCommandTemplate` and `testCommandTemplate` extension settings.
- Added tests covering env-based template resolution and selective command-template env copying.

### 0.1.2 (2026-05-02)

- Consolidated command templates for running scripts, pytest, and unittest into a single testCommandTemplate.
- Updated function signatures and internal logic in runCurrentFile and runLastFile to accommodate the new testCommandTemplate.
- Introduced a new debugBusyTerminal module to manage debug session states and terminal behavior.
- Enhanced launch configuration handling by allowing specification of launch.json paths and limiting managed target configurations.
- Removed legacy environment variables related to run command templates and streamlined environment handling.
- Updated pytest and unittest target selection interfaces to use unified testFunction and testTarget properties.
- Improved runtime formatting in runTaskStatusText to provide more human-readable output.
- Added tests to ensure correct behavior of new configurations and refactored existing tests to align with changes.

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
