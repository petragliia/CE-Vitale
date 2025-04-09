import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithEmailWithRetry } from "../firebaseConfig";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { registrarOperacao } from "../services/registroService";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const loginComEmail = async (email, senha) => {
    try {
      setErro(null);
      setLoading(true);
      // Usando a função com retry em vez da função padrão
      await signInWithEmailWithRetry(email, senha);
      
      // Carregar o nome do usuário se disponível
      if (auth.currentUser) {
        await carregarNomeUsuario(auth.currentUser.uid);
      }
    } catch (error) {
      console.error("Erro ao fazer login:", error.code, error.message);
      
      // Melhor tratamento de erros específicos
      if (error.code === 'auth/network-request-failed') {
        setErro("Erro de conexão. Verifique sua internet.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErro("E-mail ou senha inválidos");
      } else {
        setErro(`Erro ao fazer login: ${error.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginComGoogle = async () => {
    try {
      setErro(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Usar o displayName do Google se disponível
      if (result.user.displayName) {
        setDisplayName(result.user.displayName);
        await salvarNomeUsuario(result.user.uid, result.user.displayName);
      } else {
        await carregarNomeUsuario(result.user.uid);
      }
    } catch (error) {
      setErro("Erro ao fazer login com Google");
      console.error("Erro ao fazer login com Google:", error);
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await registrarOperacao(
          currentUser.email,
          'logout',
          'Sistema',
          'Saída do Sistema'
        );
      }
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  function signup(email, password, nome) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        // Atualizar o perfil com o nome
        if (nome) {
          await updateProfile(userCredential.user, {
            displayName: nome
          });
          
          // Salvar no Firestore também para persistência adicional
          await salvarNomeUsuario(userCredential.user.uid, nome);
          setDisplayName(nome);
        }
        return userCredential;
      });
  }
  
  // Função para salvar o nome do usuário no Firestore
  const salvarNomeUsuario = async (uid, nome) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      await setDoc(userDocRef, { nome: nome }, { merge: true });
      setDisplayName(nome);
    } catch (error) {
      console.error("Erro ao salvar nome do usuário:", error);
    }
  };
  
  // Função para carregar o nome do usuário do Firestore
  const carregarNomeUsuario = async (uid) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().nome) {
        setDisplayName(userDoc.data().nome);
      } else if (auth.currentUser && auth.currentUser.displayName) {
        // Usar displayName do Firebase Auth se disponível
        setDisplayName(auth.currentUser.displayName);
      }
    } catch (error) {
      console.error("Erro ao carregar nome do usuário:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await carregarNomeUsuario(user.uid);
      } else {
        setDisplayName("");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    displayName,
    loginComEmail,
    loginComGoogle,
    logout,
    erro,
    signup,
    salvarNomeUsuario,
    carregarNomeUsuario
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
