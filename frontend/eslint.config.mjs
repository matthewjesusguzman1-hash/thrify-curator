export default [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {},
  },
  {
    ignores: ["build/**", "node_modules/**", "public/**"],
  },
];

// Note: react-hooks/exhaustive-deps rules in source files are handled by
// eslint-disable comments and do not need plugin configuration here.
