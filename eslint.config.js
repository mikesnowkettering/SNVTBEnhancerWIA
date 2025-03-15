module.exports = [
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 12, sourceType: 'module' },
      globals: {
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
      },
    },
    rules: { 'prettier/prettier': 'error' },
  },
];
