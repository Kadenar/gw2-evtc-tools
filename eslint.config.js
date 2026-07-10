import js from "@eslint/js";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// Note: this project uses the native-port `typescript@7`, whose npm package no
// longer exposes the classic compiler API that `typescript-eslint` needs. So we
// parse TS/TSX with Babel (no dependency on the `typescript` package) and rely
// on `tsc -b` (in `npm run build`) for type checking. ESLint here covers
// hooks correctness and general code-quality rules.
export default [
  { ignores: ["dist/**", "node_modules/**"] },

  // App source: browser globals, TS + JSX via Babel.
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [
            "@babel/preset-typescript",
            ["@babel/preset-react", { runtime: "automatic" }],
          ],
        },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // The Babel parser strips TS types before scope analysis, so these core
      // rules false-positive on type positions (e.g. type-only imports look
      // unused, type names look undefined). `tsc -b` handles both correctly.
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },

  // Node-context config files (vite config, etc.).
  {
    files: ["*.{js,ts}", "vite.config.ts"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-typescript"],
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
    },
  },
];
