import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
export default [
  // Apply recommended rules
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Ignore compiled files
  {
    ignores: ["dist/", "node_modules/"],
  },
  // Custom rules
  {
    rules: {
      // Allow unused vars if prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Let TypeScript infer return types
      "@typescript-eslint/explicit-function-return-type": "off",
      // Warn but don't block on 'any' usage
      "@typescript-eslint/no-explicit-any": "warn",
      // Require semicolons
      semi: ["error", "always"],
      // Require double quotes
      quotes: ["error", "double"],
    },
  },
];
