/**
 * Configuração do Firebase Emulator para testes
 */

// Função para configurar o Firebase para usar o emulador local
function connectToEmulator(firebase) {
  if (!firebase) return false;
  
  try {
    const firestore = firebase.firestore();
    
    // Conecta ao emulador do Firestore na porta padrão (8080)
    firestore.useEmulator('localhost', 8080);
    
    console.log('Conectado ao emulador do Firebase Firestore');
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao emulador do Firebase:', error);
    return false;
  }
}

module.exports = { connectToEmulator };
