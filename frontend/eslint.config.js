const reactPlugin = require("eslint-plugin-react");

module.exports = [
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react: reactPlugin },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "no-unused-vars": "warn",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-empty": "off",
      "no-case-declarations": "off",
      "no-useless-catch": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/no-unknown-property": "off",
      "no-control-regex": "off",
    },
  },
  { ignores: ["build/", "node_modules/", "public/"] },
];
