import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.mjs"
    ]
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "apps/api/test/*.ts",
            "apps/web/*.config.ts",
            "packages/database/*.config.ts",
            "packages/database/src/*.test.ts",
            "packages/domain/src/*.test.ts"
          ]
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
