import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
    {
        ignores: ["out/**", "dist/**", "node_modules/**"],
    },
    eslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                process: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
        },
        rules: {
            ...tsPlugin.configs["recommended"].rules,
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
        },
    },
];
