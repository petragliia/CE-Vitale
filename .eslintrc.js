/**
 * Configuração do ESLint compatível com sua versão do Node.js
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended', // Adicionado plugin react-hooks
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks', // Adicionado o plugin react-hooks aqui também
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Regras mais flexíveis para desenvolvimento
    'no-unused-vars': 'warn',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/display-name': 'off',
    'react/no-unescaped-entities': 'off', // Desativa os erros de entidades não-escapadas
    'react-hooks/exhaustive-deps': 'warn', // Configura o exhaustive-deps como warn em vez de error
  },
};
