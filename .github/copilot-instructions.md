# Copilot Instructions for Cleats: Python Launchpad

## Product Intent

- Reduce friction for running and debugging Python scripts in VS Code.
- Keep launch configuration management deterministic and non-destructive.
- Preserve a fast loop with current-file and last-file commands.

## Functional Behavior Requirements

- Provide and maintain these commands:
    - Run Current File
    - Debug Current File
    - Run Last File
    - Debug Last File
- Resolve targets only when all checks pass:
    - active editor exists,
    - file is saved,
    - file is Python,
    - file is inside an open workspace folder.
- Persist last valid target per workspace.
- Build run commands from a managed launch.json run-template entry.
    - Seed that template from `cleatsPythonLaunchpad.runCommandTemplate` placeholders.
    - Ensure managed target debug configurations reference the managed run-template entry.
- Declare dependency on `ms-python.python` in the extension manifest.
- For debug actions, require and activate `ms-python.python`.
- For run actions, support configuring whether a new terminal should open when a previous run is still active.
- Manage generated launch configurations with deterministic marker metadata.
- Preserve user-managed launch configurations unchanged.
- Clear stale stored target when the referenced file no longer exists or is invalid.

## Configuration Requirements

- Keep `cleatsPythonLaunchpad.runCommandTemplate`.
- Keep `cleatsPythonLaunchpad.generatedLaunchNamePrefix`.
- Keep `cleatsPythonLaunchpad.runOpenNewTerminalIfBusy`.
- Keep `cleatsPythonLaunchpad.terminalReveal` enum values:
    - `always`
    - `silent`
    - `never`

## Quality Gate

- Core launch/config helpers must remain unit-tested.
- Lint and test must run in CI.
- TypeScript must compile in strict mode.
- Before merging release-impacting changes, run:
    - `npm run ci`
    - `npm run package`

## Manual Release Process

### Pre-release checklist

- This project releases manually. Do not assume GitHub Actions publish automation or secret-based publish flow exists.
- Pull latest `main`.
- Verify `package.json` fields:
    - name: `cleats-python-launchpad`
    - displayName is correct
    - publisher matches Marketplace publisher ID
    - version is bumped
- Validate locally:
    - `npm ci`
    - `npm run ci`
    - `npm run package`
- Smoke-test the generated VSIX in a clean VS Code profile.

### GitHub release preparation

- Create git tag `vX.Y.Z` matching package version.
- Create GitHub Release and include notable user-facing behavior notes.
- Attach the generated VSIX to the GitHub Release if you want a downloadable artifact.

### Marketplace publish

- Publish from a local shell after validation. Prefer publishing the already-tested VSIX:
    - `npx @vscode/vsce publish --packagePath ./cleats-python-launchpad-X.Y.Z.vsix`
- If packaging again is necessary, rebuild locally first and then publish the fresh VSIX.
- Verify Marketplace page renders correctly:
    - display name
    - README
    - version

### Post-release

- Install from Marketplace and run smoke tests.
- Confirm command palette entries and keybindings are available.
- Confirm current-file and last-file run/debug flows work with settings overrides.

## Release Notes Template

Use this format for release descriptions:

```md
### Summary

Short description of the release and target users.

### Highlights

- Item 1
- Item 2
- Item 3

### Added

-

### Changed

-

### Fixed

-

### Configuration or Behavior Notes

- Mention changed command behavior, settings defaults, and migration notes.
```

### Validation

- `npm run ci` passed.
- VSIX package built.
- Smoke test completed in VS Code.

### Artifacts

- VSIX file name.
