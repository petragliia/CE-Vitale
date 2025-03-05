import React, { useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const Estoque = ({ nomeEstoque }) => {
  const [produtos, setProdutos] = useState([]);
  const [novoProduto, setNovoProduto] = useState("");

  const colecaoRef = collection(db, nomeEstoque);

  const listarProdutos = async () => {
    const data = await getDocs(colecaoRef);
    setProdutos(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  };

  const adicionarProduto = async () => {
    if (novoProduto.trim() === "") return;
    await addDoc(colecaoRef, { nome: novoProduto });
    setNovoProduto("");
    listarProdutos();
  };

  const atualizarProduto = async (id, novoNome) => {
    const produtoDoc = doc(db, nomeEstoque, id);
    await updateDoc(produtoDoc, { nome: novoNome });
    listarProdutos();
  };

  const deletarProduto = async (id) => {
    const produtoDoc = doc(db, nomeEstoque, id);
    await deleteDoc(produtoDoc);
    listarProdutos();
  };

  return (
    <div>
      <h2>{nomeEstoque}</h2>
      <input
        value={novoProduto}
        onChange={(e) => setNovoProduto(e.target.value)}
        placeholder="Novo Produto"
      />
      <button onClick={adicionarProduto}>Adicionar Produto</button>
      <button onClick={listarProdutos}>Listar Produtos</button>
      <ul>
        {produtos.map((produto) => (
          <li key={produto.id}>
            <input
              value={produto.nome}
              onChange={(e) =>
                atualizarProduto(produto.id, e.target.value)
              }
            />
            <button onClick={() => deletarProduto(produto.id)}>Deletar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Estoque;