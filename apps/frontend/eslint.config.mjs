import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // Enforce OnPush for better performance
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',

      // Enforce signal/lifecycle hygiene
      '@angular-eslint/sort-lifecycle-methods': 'warn',

      // Enforce decorator syntax over metadata properties
      '@angular-eslint/no-inputs-metadata-property': 'error',
      '@angular-eslint/no-outputs-metadata-property': 'error',

      // Frontend: no-console in production code
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Require trackBy in *ngFor / @for equivalents
      '@angular-eslint/template/use-track-by-function': 'warn',

      // No ?async negation (async pipe with ! is a bug)
      '@angular-eslint/template/no-negated-async': 'error',

      // Accessibility
      '@angular-eslint/template/alt-text': 'error',
      '@angular-eslint/template/elements-content': 'error',
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/table-scope': 'error',
      '@angular-eslint/template/valid-aria': 'error',

      // No inline styles
      '@angular-eslint/template/no-inline-styles': [
        'error',
        { allowNgStyle: true, allowBindToStyle: true },
      ],
    },
  },
  {
    // Relax rules in spec files
    files: ['**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
