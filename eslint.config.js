const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'server/**', '.expo/**'] },
  {
    settings: {
      'import/resolver': { typescript: { project: './jsconfig.json' } },
    },
  },
  {
    files: ['**/*.test.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  {
    // Avisos existentes al adoptar ESLint; el código nuevo conserva la regla estricta.
    files: [
      'src/features/auth/AuthProvider.js',
      'src/features/admin/hooks/useUsers.js',
      'src/features/orders/useLiveOrders.js',
    ],
    rules: { 'react-hooks/set-state-in-effect': 'warn' },
  },
]);
