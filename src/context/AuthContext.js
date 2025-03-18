import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { registrarOperacao } from "../services/registroService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const loginComEmail = async (email, senha) => {
    try {
      setErro(null);
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (error) {
      setErro("E-mail ou senha inválidos");
      console.error("Erro ao fazer login:", error);
    }
  };

  const loginComGoogle = async () => {
    try {
      setErro(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loginComEmail,
    loginComGoogle,
    logout,
    erro,
    signup
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
