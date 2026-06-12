/**
 * Enforces sim purity: no DOM / Pixi imports and no non-deterministic
 * primitives inside src/sim/. All randomness must route through rng.ts.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/**', 'dist-electron/**', 'node_modules/**'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
  overrides: [
    {
      files: ['src/sim/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              { group: ['pixi.js', 'pixi.js/*'], message: 'Sim must not import Pixi.' },
              { group: ['@render/*', '@ui/*'], message: 'Sim must not import render or ui.' },
            ],
          },
        ],
        'no-restricted-globals': [
          'error',
          { name: 'document', message: 'Sim is headless.' },
          { name: 'window', message: 'Sim is headless.' },
        ],
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
            message: 'Use the seeded RNG in @sim/rng instead of Math.random.',
          },
          {
            selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
            message: 'Do not use Date.now inside the sim; tick time is authoritative.',
          },
        ],
      },
    },
  ],
};
