
# Development

Install and validate:

```sh
npm install
npm run ci
```

## Debugging In VS Code

Launch profiles in `.vscode/launch.json`:

- `Run Extension (Build Once)`
- `Run Extension (Watch)`

Useful tasks in `.vscode/tasks.json`:

- `npm: compile`
- `npm: watch`
- `npm: lint`
- `npm: test`
- `npm: package`

Smoke test flow:

1. Run `Run Extension (Watch)`.
2. Open a Python file in the Extension Development Host.
3. Execute `Run Current File` and `Debug Current File`.
4. Switch file and verify `Run Last File` and `Debug Last File` use the expected target.

## Release Process

- Releases are manual.
- The authoritative Copilot-facing checklist lives in `.github/copilot-instructions.md`.
- Before packaging, verify `package.json` release metadata (for example `version` and `icon`).
- Recommended release flow:

```sh
npm ci
npm run ci
npm run package
```

- Publish the tested VSIX from a local shell:

```sh
npx @vscode/vsce publish --packagePath ./cleats-python-launchpad-X.Y.Z.vsix
```
