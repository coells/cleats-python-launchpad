## Mission

VSCode extension that allows for easy and quick running and debugging of Python files.

## Context

- See [../README.md](../README.md) for the current user-facing behavior.
- This prompt reflects the implementation state in src/ as of 2026-05-13.

## Stories & Features

Story: Resolve Active Python Target

- Trigger: User runs Run Current File or Debug Current File.
- Action: Resolve target only if all checks pass:
    - an active editor exists,
    - the file is saved (not untitled),
    - the file is Python,
    - the file is inside an open workspace folder.
- Fallback: If any check fails, show an informative warning and do nothing.

Story: Quick Run

- Trigger: Open a Python file and press Ctrl+Shift+F10.
- Action: Resolve target and store it as the last target.
- Action: If target has no managed configuration yet and execute dialog is enabled, show first-execution setup dialog.
- Action: Ensure managed launch entry exists in launch.json for the target.
- Action: Run target in integrated terminal.
- Condition: If target is already configured, reuse existing managed entry without re-creating it.

Story: Quick Debug

- Trigger: Open a Python file and press Ctrl+Shift+F9.
- Action: Resolve target and require ms-python.python extension before starting debug.
- Action: If target has no managed configuration yet and execute dialog is enabled, show first-execution setup dialog.
- Action: Ensure managed launch entry exists in launch.json for the target.
- Action: Start debugging for the target.
- Must: For script targets, launch by managed configuration name so Run and Debug keeps the selected Launchpad target for F5 reuse.
- Condition: If target is already configured, reuse existing managed entry without re-creating it.

Story: Quick Previous Run

- Trigger: Press Ctrl+F10 without needing editor focus.
- Action: Re-run the previously stored target.
- Condition: If previous target is missing or invalid, clear stale stored target and show warning.
- Fallback: If no previous target exists, do nothing.

Story: Quick Previous Debug

- Trigger: Press Ctrl+F9 without needing editor focus.
- Action: Re-debug the previously stored target.
- Condition: If previous target is missing or invalid, clear stale stored target and show warning.
- Fallback: If no previous target exists, do nothing.

Story: Detection of Script and Test Target

- Trigger: Running/debugging a Python file.
- Action: Detect test files by filename patterns (test*.py, *\_test.py).
- Action: For current-file flows in test files, resolve selection by cursor position:
    - inside function/method -> function/method target,
    - outside function/method -> file/module target.
- Action: For last-file flows, reuse stored test target/function context.

Story: Test Framework Resolution

- Trigger: Target is detected as test file.
- Action: Resolve configured framework from python settings:
    - python.testing.pytestEnabled,
    - python.testing.unittestEnabled.
- Condition: Prefer pytest when enabled; otherwise unittest when enabled; otherwise default to pytest in run/debug flows that need a framework fallback.

Story: Current Working Directory Is Respected

- Trigger: Running/debugging any target.
- Action: Use managed configuration cwd when present.
- Action: Default cwd to workspace folder path for managed launch entries.
- Action: Resolve run working directory robustly for script/test execution.
- Default: For scripts, use workspace folder as cwd represented by {workspaceFolder} in run command template.

Feature: Execute Dialog (First Unmanaged Execution)

- When: User is about to run/debug a target that has no managed entry.
- Condition: Show dialog only if cleatsPythonLaunchpad.executeDialogEnabled is true.
- Customization fields (in order):
    - run command, preset from cleatsPythonLaunchpad.runCommandTemplate or cleatsPythonLaunchpad.testCommandTemplate with target placeholders,
    - current working directory, preset from launchConfigurationTemplate or workspace folder,
    - launch.json target selection (only for multi-root).
- Cancellation: Cancel any dialog step to abort current run/debug action.

Feature: Multi-Root Workspace Launch Selection

- What: Extension supports selecting/managing launch.json target workspace folder.
- How: cleatsPythonLaunchpad.launchJsonPath controls selection.
- Accepted forms:
    - absolute path to launch.json,
    - folder path mapped to <folder>/.vscode/launch.json,
    - empty string = target file workspace folder.
- Fallback: If configured path cannot be matched, use target file workspace folder.

Feature: Managed Launch Configuration Lifecycle

- What: Extension manages per-target launch entries in launch.json.
- Identity: Managed target is identified by:
    - name: "<prefix>: <python-file-name>", where <prefix> is from cleatsPythonLaunchpad.generatedLaunchNamePrefix,
    - presentation.group: "<prefix>".
- Action: Preserve user-managed launch configurations unchanged.
- Action: Preserve existing managed target configuration unchanged when target already exists.
- Action: For new managed target creation, apply launchConfigurationTemplate overrides with safe metadata stripping.
- Action: Include exactly one managed command-template env key on creation:
    - scripts: PYTHON_LAUNCHPAD_RUN_COMMAND, from cleatsPythonLaunchpad.runCommandTemplate with {script} placeholder,
    - tests: PYTHON_LAUNCHPAD_TEST_COMMAND, from cleatsPythonLaunchpad.testCommandTemplate with {testTarget} placeholder.
- Condition: If "<prefix>: <python-file-name>" already exists but points to a different target, generate a unique name with suffix (e.g. "<prefix>: <python-file-name> (2)").
- Limit: Enforce cleatsPythonLaunchpad.managedTargetConfigurationLimit by removing oldest managed targets only.

Feature: Command Templates and Environment

- What: Run/test templates are fixed in extension code.
- Defaults:
    - run template: python {script}
    - test template: python -m pytest {testTarget}
- Env keys:
    - PYTHON_LAUNCHPAD_RUN_COMMAND,
    - PYTHON_LAUNCHPAD_TEST_COMMAND.
- Action: Resolve effective runtime command from managed env value with fallback to built-in defaults.

Feature: Busy Run/Debug Behavior

- Run behavior:
    - Setting cleatsPythonLaunchpad.runOpenNewTerminalIfBusy controls whether a new terminal panel is opened when same target run is active.
- Debug behavior:
    - Setting cleatsPythonLaunchpad.debugOpenNewTerminalIfBusy controls behavior when matching debug target is already active.
    - If false and matching target is busy: do not start another debug process and show info message.
    - If true and matching target is busy: allow second debug launch with invocation suffix.

Feature: Terminal Reveal and Run Summary

- Setting cleatsPythonLaunchpad.terminalReveal supports:
    - always,
    - silent,
    - never.
- Action: Run command prints terminal summary tail with status, exit code, and runtime.

Feature: Remove Managed Target Configurations Command

- Trigger: User invokes Remove Managed Target Configurations command.
- Action: Remove only managed target launch entries across workspace folders.
- Action: Keep user-defined launch entries untouched.
- Feedback: Show informational result message with counts.

Feature: Settings

- cleatsPythonLaunchpad.generatedLaunchNamePrefix, default value "Launchpad".
- cleatsPythonLaunchpad.launchJsonPath, no default value.
- cleatsPythonLaunchpad.managedTargetConfigurationLimit, default value 20.
- cleatsPythonLaunchpad.launchConfigurationTemplate, default value {}.
- cleatsPythonLaunchpad.executeDialogEnabled, default value true.
- cleatsPythonLaunchpad.runOpenNewTerminalIfBusy, default value true.
- cleatsPythonLaunchpad.debugOpenNewTerminalIfBusy, default value true.
- cleatsPythonLaunchpad.terminalReveal enum values: - always - silent - never
- cleatsPythonLaunchpad.runCommandTemplate, default value "python {script}",
- cleatsPythonLaunchpad.testCommandTemplate, default value "python -m pytest {testTarget}",

## Quality Gate

- Core launch/config helpers remain unit-tested.
- Lint and tests run in CI.
- TypeScript compiles in strict mode.
- Before merge for release-impacting changes, run:
    - npm run ci
    - npm run package

## Output Contract

- Update [../README.md](../README.md) whenever behavior changes so user-facing docs stay aligned.

## Handoff

Type: standard

---

# 4. Execution Semantics And Runtime Guide

Use this chapter together with the Playbook. It merges authoring semantics and runtime interpretation.

### Global Rules

- Human lead: Write at least one explicit imperative in Story/Feature (for example in Goal or Action) when you expect real implementation.
- LLM interpret: Treat Story/Feature blocks as executable directives by default. If feasible and allowed, perform the work before reporting.

- Human lead: Use Output Contract to shape deliverables, not to accidentally suppress execution.
- LLM interpret: Output Contract controls response shape and deliverables. It does not downgrade imperative work to analysis unless Execution says report-only or equivalent wording is explicit.

- Human lead: State completion criteria in Done and Validation as observable checks.
- LLM interpret: Prefer shipping verified results over plans. Ask one focused question only when blocked by missing critical input.

### Mission

- Human lead: Define a concrete outcome, not only a topic.
- LLM interpret: Optimize decisions for this outcome unless constrained by Scope or Guardrails.

### Context

- Human lead: Include only facts that materially affect execution.
- LLM interpret: Treat Context as factual input and assumptions boundary; do not invent missing facts.

### Scope

- Human lead: Make In and Out explicit enough to prevent drift.
- LLM interpret: Execute only inside In; reject or defer Out unless user explicitly expands scope.

### Story Or Feature

- Human lead: Express desired behavior as imperatives and add recommended keywords as needed; no fixed keyword set is required.
- LLM interpret: Parse all provided keywords by intent, including custom ones. Unknown keywords are still meaningful constraints or signals.

- Human lead: Use Mode only when you need to override default execution style.
- LLM interpret: Default Mode is imperative. Exploratory mode allows analysis-first behavior.

- Human lead: Put decisive completion criteria in Done.
- LLM interpret: Treat Done as the block-level acceptance test.

### Guardrails

- Human lead: Put non-negotiables in Must and Must Not.
- LLM interpret: Must and Must Not override soft preferences and default heuristics.

### Output Contract

- Human lead: Specify format and required sections. Use Execution explicitly when you want report-only behavior.
- LLM interpret: If Execution is omitted, infer act for imperative stories/features and mixed only when task naturally requires both implementation and reporting.

### Validation

- Human lead: Define verifiable checks, not subjective quality claims.
- LLM interpret: Run checks where possible and report evidence plus remaining gaps.

### References

- Human lead: Add trigger-based external sources only when needed.
- LLM interpret: Load references lazily on trigger; avoid unnecessary context expansion.

### Handoff

- Human lead: Choose handoff depth by continuity risk and task complexity.
- LLM interpret: Expand Handoff Type into the full schema and provide continuation-ready context.

### Runtime Behavior Rules

- Human lead: Keep assumptions explicit and minimal.
- LLM interpret: Distinguish facts, assumptions, and inferences in outputs.

- Human lead: Keep story and feature boundaries coherent.
- LLM interpret: Execute in coherent chunks and update handoff after meaningful progress.

- Human lead: Provide blocker resolution policy when needed.
- LLM interpret: On blocker, ask one focused question with the minimum missing input.

### Reproducible Handoff Expansion

Keyword contract:

- Author provides only Handoff Type in the specification.
- LLM expands the full handoff structure from this guide.
- If Handoff Type is missing, default to standard.

```text
Handoff Type: concise
Output Schema:
- summary: <2-4 lines outcome summary>
- reproducible_description:
  - objective: <what was solved>
  - inputs_used: <files, facts, assumptions>
  - steps_taken: <ordered short steps>
  - outputs_produced: <artifacts or results>
- risks: <open risks>
- next_inputs: <minimum missing inputs>
- next_context: <copy-ready continuation text>
```

```text
Handoff Type: standard
Output Schema:
- summary: <short outcome>
- reproducible_description:
  - objective: <target outcome>
  - environment: <runtime, tools, constraints>
  - inputs_used: <sources and assumptions>
  - procedure: <ordered procedure another model can replay>
  - verification: <how result was checked>
  - outputs_produced: <what now exists>
  - limitations: <known boundaries>
- decisions: <key trade-offs>
- risks: <open risks>
- next_inputs: <required to continue>
- next_context: <copy-ready continuation text>
```

```text
Handoff Type: audit
Output Schema:
- summary: <short outcome>
- reproducible_description:
  - objective: <target outcome>
  - inputs_used: <all material inputs>
  - full_step_log: <numbered replayable steps>
  - checkpoints: <intermediate states>
  - verification_evidence: <tests, checks, observations>
  - outputs_produced: <final artifacts>
  - residual_uncertainty: <what remains unknown>
- decisions: <decision log with rationale>
- risks: <ranked risks>
- next_inputs: <precise missing data>
- next_context: <copy-ready continuation text>
```

## 5. Quick Checklist

- Story/Feature language is imperative when implementation is expected.
- Keyword bullets are helpful and sufficient, without forcing rigid schema.
- Output Contract shape is clear and Execution mode is intentional.
- Validation is observable and evidence-oriented.
- Handoff Type is set and expanded correctly in the final output.
