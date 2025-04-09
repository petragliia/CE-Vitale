// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQevQiHBE8N0slgDf7xjaFhIBmxZ0UwB4",
  authDomain: "controleestoquevitale.firebaseapp.com",
  projectId: "controleestoquevitale",
  storageBucket: "controleestoquevitale.appspot.com",
  messagingSenderId: "454943180156",
  appId: "1:454943180156:web:2f849fa0094fe4b7e5d0f9",
  measurementId: "G-EZSRPE3TNJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistência para melhorar a estabilidade da autenticação
setPersistence(auth, browserSessionPersistence)
  .catch((error) => {
    console.error("Erro ao configurar persistência:", error);
  });

// Configure para exibir erros detalhados no console
if (process.env.NODE_ENV === 'development') {
  console.log('Modo de desenvolvimento ativado - logs detalhados de erros Firebase');
}

// Função para tentar autenticação com tratamento de erros de rede
const signInWithEmailWithRetry = async (email, password, maxRetries = 3) => {
  let retries = 0;
  
  const attemptSignIn = async () => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/network-request-failed' && retries < maxRetries) {
        retries++;
        console.log(`Tentativa ${retries} de ${maxRetries} falhou. Tentando novamente em 2 segundos...`);
        
        // Aguarda 2 segundos antes de tentar novamente
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(attemptSignIn());
          }, 2000);
        });
      }
      
      // Se não for erro de rede ou já tentou o número máximo de vezes, propaga o erro
      throw error;
    }
  };
  
  return attemptSignIn();
};

export { auth, db, signInWithEmailWithRetry };
