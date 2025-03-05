import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore"; // Importe as funções necessárias

const firebaseConfig = {
  apiKey: "AIzaSyBQevQiHBE8N0slgDf7xjaFhIBmxZ0UwB4",
  authDomain: "controleestoquevitale.firebaseapp.com",
  projectId: "controleestoquevitale",
  storageBucket: "controleestoquevitale.appspot.com",
  messagingSenderId: "454943180156",
  appId: "1:454943180156:web:2f849fa0094fe4b7e5d0f9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Função de teste corrigida
const testConnection = async () => {
  try {
    const testCol = collection(db, 'test');
    await addDoc(testCol, { test: new Date() });
    console.log("Conexão com Firestore OK");
  } catch (error) {
    console.error("Erro na conexão com Firestore:", error);
  }
};

testConnection();