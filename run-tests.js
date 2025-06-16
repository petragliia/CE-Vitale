/**
 * Script de execução de testes com mocks
 * Este script configura o ambiente para usar o mock do Firebase
 */

const { execSync } = require('child_process');

// Configuração do ambiente
process.env.USE_FIREBASE_MOCK = 'true';
process.env.NODE_ENV = 'test';

// Função para executar um comando e mostrar a saída
function runCommand(command) {
  console.log(`\n$ ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao executar o comando: ${error.message}`);
    return false;
  }
}

console.log('\n=== Executando testes com mocks do Firebase ===\n');

// Rodar os testes com Jest
runCommand('npx jest --config=jest.config.js');
