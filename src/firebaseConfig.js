// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQevQiHBE8N0slgDf7xjaFhIBmxZ0UwB4",
  authDomain: "controleestoquevitale.firebaseapp.com",
  projectId: "controleestoquevitale",
  storageBucket: "controleestoquevitale.appspot.com",
  messagingSenderId: "454943180156",
  appId: "1:454943180156:web:2f849fa0094fe4b7e5d0f9"
};

try {
  // Inicializa o Firebase sem atribuir a uma variável, já que não é necessário usá-la diretamente
  initializeApp(firebaseConfig);
  console.log("Firebase inicializado com sucesso!");
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

export const auth = getAuth();
export const db = getFirestore();
