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
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [userStatus, setUserStatus] = useState("pending");

  const loginComEmail = async (email, senha) => {
    try {
      setErro(null);
      setLoading(true);
      // Usando a função com retry em vez da função padrão
      await signInWithEmailWithRetry(email, senha);
      
      // Carregar o nome do usuário se disponível
      if (auth.currentUser) {
        await carregarDadosUsuario(auth.currentUser.uid);
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
        await carregarDadosUsuario(result.user.uid);
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
  const salvarNomeUsuario = async (uid, nome, role = "user", status = "pending") => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      await setDoc(userDocRef, { 
        nome: nome,
        role: role,
        status: status,
        createdAt: new Date()
      }, { merge: true });
      setDisplayName(nome);
      setUserRole(role);
      setUserStatus(status);
    } catch (error) {
      console.error("Erro ao salvar dados do usuário:", error);
    }
  };
  
  // Função para carregar os dados do usuário do Firestore
  const carregarDadosUsuario = async (uid) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.nome) {
          setDisplayName(userData.nome);
        }
        // Carregar papel/função e status do usuário
        setUserRole(userData.role || "user");
        setUserStatus(userData.status || "pending");
      } else if (auth.currentUser && auth.currentUser.displayName) {
        // Usar displayName do Firebase Auth se disponível
        setDisplayName(auth.currentUser.displayName);
        // Se o documento não existe, criar com valores padrão
        await salvarNomeUsuario(uid, auth.currentUser.displayName);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);
    }
  };
  
  // Função para atualizar o status de um usuário
  const atualizarStatusUsuario = async (uid, novoStatus) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      await updateDoc(userDocRef, { status: novoStatus });
      
      // Se for o usuário atual, atualizar o estado
      if (currentUser && currentUser.uid === uid) {
        setUserStatus(novoStatus);
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao atualizar status do usuário:", error);
      return false;
    }
  };
  
  // Função para atualizar o papel/função de um usuário
  const atualizarRoleUsuario = async (uid, novaRole) => {
    try {
      const userDocRef = doc(db, "usuarios", uid);
      await updateDoc(userDocRef, { role: novaRole });
      
      // Se for o usuário atual, atualizar o estado
      if (currentUser && currentUser.uid === uid) {
        setUserRole(novaRole);
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao atualizar papel do usuário:", error);
      return false;
    }
  };
  
  // Função para listar todos os usuários (apenas para admins)
  const listarUsuarios = async () => {
    try {
      const usuariosRef = collection(db, "usuarios");
      const usuariosSnapshot = await getDocs(usuariosRef);
      
      const listaUsuarios = [];
      usuariosSnapshot.forEach(doc => {
        listaUsuarios.push({
          uid: doc.id,
          ...doc.data()
        });
      });
      
      return listaUsuarios;
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await carregarDadosUsuario(user.uid);
      } else {
        setDisplayName("");
        setUserRole("user");
        setUserStatus("pending");
      }
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    currentUser,
    displayName,
    userRole,
    userStatus,
    loginComEmail,
    loginComGoogle,
    logout,
    erro,
    signup,
    salvarNomeUsuario,
    carregarDadosUsuario,
    atualizarStatusUsuario,
    atualizarRoleUsuario,
    listarUsuarios,
    isAdmin: () => userRole === "admin",
    isApproved: () => userStatus === "approved"
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
