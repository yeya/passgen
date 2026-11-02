import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
  {
    ignores: ['.output/', '.wxt/', 'coverage/', 'node_modules/', 'playwright-report/', 'test-results/'],
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  jsdoc.configs['flat/recommended-error'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.webextensions },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      // Correctness and clarity.
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-implicit-coercion': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'all' }],
      'no-use-before-define': ['error', { functions: false }],
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'chrome', message: "Use `browser` from 'wxt/browser' so the code runs in every browser." },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use src/lib/random.js (crypto.getRandomValues).' },
      ],
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'no-else-return': 'error',
      'no-nested-ternary': 'error',
      'consistent-return': 'error',

      // JSDoc: every function documented and typed.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: false,
          require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
          checkConstructors: false,
        },
      ],
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/reject-any-type': 'error',
      'jsdoc/tag-lines': ['error', 'never', { startLines: 1 }],

      // Vue.
      'vue/no-v-html': 'error',
      'vue/require-default-prop': 'error',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/no-unused-refs': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/define-macros-order': 'error',
      'vue/no-ref-object-reactivity-loss': 'error',
      'vue/require-explicit-emits': 'error',
    },
  },
  {
    files: ['tests/**', '**/*.test.js', '*.config.js', 'scripts/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['tests/**'],
    rules: {
      // E2E tests inspect the real `chrome` API inside the service worker, and
      // unit tests cast fakes to `any`.
      'no-restricted-globals': 'off',
      'jsdoc/reject-any-type': 'off',
    },
  },
  prettier,
];
