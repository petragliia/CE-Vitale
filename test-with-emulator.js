/**
 * Script para executar testes com o Firebase Emulator
 * Este script configura o ambiente e executa os testes
 */

const { exec } = require('child_process');

// Configuração do ambiente
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.NODE_ENV = 'test';
process.env.USE_FIREBASE_EMULATOR = 'true';

console.log('====================================');
console.log('Executando testes com Firebase Emulator');
console.log('====================================');

// Execute o Firebase Emulator
console.log('Verificando se o Firebase Emulator está rodando...');

// Função para executar os testes
function runTests() {
  console.log('Executando os testes...');
  const testProcess = exec('jest --config=jest.config.js', (error, stdout, stderr) => {
    console.log(stdout);
    if (error) {
      console.error('Erro ao executar os testes:', stderr);
      process.exit(1);
    }
    console.log('Testes concluídos com sucesso!');
    process.exit(0);
  });
  
  testProcess.stdout.pipe(process.stdout);
  testProcess.stderr.pipe(process.stderr);
}

// Verificar se o emulador está rodando
exec('curl -s http://localhost:8080', (error) => {
  if (error) {
    console.log('Firebase Emulator não está rodando. Por favor, execute:');
    console.log('firebase emulators:start');
    console.log('\nDepois disso, execute este script novamente.');
    process.exit(1);
  } else {
    console.log('Firebase Emulator está rodando!');
    runTests();
  }
});
