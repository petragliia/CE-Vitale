import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, Form, notification, Input, Spin } from "antd";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import moment from "moment";
import { ReloadOutlined } from "@ant-design/icons";
import { stocks } from "../stocks";
import "./Transferencia.css";
import "./item-details-box.css";
import { registrarOperacao } from "../services/registroService";
import { useAuth } from "../context/AuthContext";

function Transferencia({ sourceStock, onBack }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destinoStock, setDestinoStock] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantidadeTransferir, setQuantidadeTransferir] = useState(0);
  const { currentUser } = useAuth();

  const sourceCollection = stocks[sourceStock];
  const destinationOptions = Object.keys(stocks).filter(key => key !== sourceStock);

  const fetchItems = useCallback(async () => {
    if (!sourceCollection) return;
    
    setIsLoading(true);
    try {
      console.log("Carregando itens da coleção:", sourceCollection);
      const querySnapshot = await getDocs(collection(db, sourceCollection));
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validade: doc.data().validade?.toDate() // Converter Timestamp para Date
      }));
      setItems(list);
      console.log(`Carregados ${list.length} itens do estoque ${sourceStock}`);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      notification.error({ message: "Erro ao carregar itens", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [sourceCollection, sourceStock]);

  // Carregar itens quando o componente montar ou o estoque de origem mudar
  useEffect(() => {
    setSelectedItem(null); // Resetar item selecionado quando mudar de estoque
    fetchItems();
  }, [sourceStock, fetchItems]);

  const handleRefresh = () => {
    setSelectedItem(null);
    setQuantidadeTransferir(0);
    fetchItems();
  };

  const handleTransfer = async () => {
    if (!selectedItem || !destinoStock || quantidadeTransferir <= 0) {
      notification.warning({ message: "Selecione um item, um destino e uma quantidade válida!" });
      return;
    }

    if (quantidadeTransferir > selectedItem.quantidade) {
      notification.warning({ message: "Quantidade insuficiente no estoque!" });
      return;
    }

    setIsTransferring(true);
    try {
      console.log('Iniciando transferência:', {
        sourceCollection,
        destinoStock,
        selectedItem,
        quantidadeTransferir
      });

      const destinationCollection = stocks[destinoStock];
      const destinationQuery = await getDocs(collection(db, destinationCollection));
      
      // Procurar item existente
      const existingDoc = destinationQuery.docs.find(d => {
        const data = d.data();
        return (
          data.nome === selectedItem.nome &&
          moment(data.validade?.toDate()).isSame(selectedItem.validade, 'day') &&
          data.tipoQuantidade === selectedItem.tipoQuantidade &&
          data.categoria === selectedItem.categoria &&
          Number(data.valor) === Number(selectedItem.valor) &&
          data.fornecedor === selectedItem.fornecedor
        );
      });

      // Verificar se o item de origem ainda existe e tem a quantidade necessária
      const sourceDocRef = doc(db, sourceCollection, selectedItem.id);
      const sourceDocSnap = await getDoc(sourceDocRef);
      
      if (!sourceDocSnap.exists()) {
        notification.error({ message: "Item não encontrado", description: "O item selecionado não está mais disponível no estoque." });
        await fetchItems(); // Atualiza a lista
        setIsTransferring(false);
        return;
      }
      
      const currentQuantity = sourceDocSnap.data().quantidade;
      if (currentQuantity < quantidadeTransferir) {
        notification.warning({ 
          message: "Quantidade insuficiente", 
          description: `Quantidade atual (${currentQuantity}) é menor que a solicitada (${quantidadeTransferir}).` 
        });
        await fetchItems(); // Atualiza a lista
        setIsTransferring(false);
        return;
      }

      console.log('Item existente encontrado:', existingDoc ? 'Sim' : 'Não');
      console.log('Detalhes do item:', {
        categoriaOrigem: selectedItem.categoria,
        valorOrigem: selectedItem.valor,
        validadeOrigem: selectedItem.validade ? moment(selectedItem.validade).format('DD/MM/YYYY') : 'N/A'
      });

      // Atualizar ou criar novo
      if (existingDoc) {
        const destDocRef = doc(db, destinationCollection, existingDoc.id);
        const destDocSnap = await getDoc(destDocRef);
        
        if (destDocSnap.exists()) {
          console.log('Atualizando item existente - somando quantidades');
          await updateDoc(destDocRef, {
            quantidade: Number(destDocSnap.data().quantidade) + quantidadeTransferir
          });
        } else {
          // Se o documento não existir mais, criar um novo
          console.log('Item existia mas foi removido, criando novo');
          await addDoc(collection(db, destinationCollection), {
            ...selectedItem,
            quantidade: quantidadeTransferir,
            validade: selectedItem.validade,
            transferredAt: serverTimestamp()
          });
        }
      } else {
        // Se não existir item com mesmo nome, tipo, validade, categoria e preço - criar novo
        console.log('Criando novo item no destino - nenhum item compatível encontrado');
        await addDoc(collection(db, destinationCollection), {
          ...selectedItem,
          quantidade: quantidadeTransferir,
          validade: selectedItem.validade,
          transferredAt: serverTimestamp()
        });
      }

      // Atualizar quantidade na origem
      if (quantidadeTransferir < currentQuantity) {
        await updateDoc(sourceDocRef, {
          quantidade: currentQuantity - quantidadeTransferir
        });
      } else {
        await deleteDoc(sourceDocRef);
      }
        
      // Registro da operação após transferência bem-sucedida
      await registrarOperacao(
        currentUser.email,
        'transferencia',
        selectedItem.nome,
        sourceStock,
        destinoStock,
        quantidadeTransferir,
        {
          categoria: selectedItem.categoria,
          valor: selectedItem.valor,
          validade: selectedItem.validade ? moment(selectedItem.validade).format('DD/MM/YYYY') : 'N/A'
        }
      );
        
      notification.success({ message: "Transferência concluída!" });
      setSelectedItem(null);
      setQuantidadeTransferir(0);
      await fetchItems(); // Recarregar itens atualizados
      
    } catch (error) {
      console.error("Erro na transferência:", error);
      notification.error({ 
        message: "Falha na transferência", 
        description: error.message 
      });
    }
    setIsTransferring(false);
  };

  return (
    <div className="transferencia-container">
      <h1>Transferência de Itens</h1>
      <div className="header-buttons">
        <Button onClick={onBack} style={{ marginRight: "10px" }}>
          Voltar
        </Button>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleRefresh}
          loading={isLoading}
          style={{ marginBottom: "20px" }}
        >
          Atualizar Lista
        </Button>
      </div>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <Spin size="large" tip="Carregando itens..." />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <p>Nenhum item disponível para transferência neste estoque.</p>
        </div>
      ) : (
        <Form layout="vertical">
          <Form.Item label="Item para Transferir">
            <Select
              placeholder="Selecione um item"
              value={selectedItem ? selectedItem.id : undefined}
              onChange={(value) => {
                const item = items.find(i => i.id === value);
                setSelectedItem(item);
                setQuantidadeTransferir(0); // Reset quantidade ao mudar item
              }}
              style={{ width: '100%' }}
              optionLabelProp="label"
              listHeight={320}
              optionHeight={70}
            >
              {items.map(item => (
                <Select.Option 
                  key={item.id} 
                  value={item.id}
                  label={item.nome}
                >
                  <div className="transferencia-item-info">
                    <strong>{item.nome}</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <span>Quantidade: {item.quantidade} {item.tipoQuantidade}</span>
                      {item.categoria && <span> | Categoria: {item.categoria}</span>}
                      <span> | Preço: R$ {Number(item.valor).toFixed(2)}</span>
                      <br />
                      <span>Validade: {item.validade ? moment(item.validade).format('DD/MM/YYYY') : 'Sem validade'}</span>
                      <br />
                      <span>Fornecedor: {item.fornecedor || 'Não especificado'}</span>
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {selectedItem && (
            <>
              <div className="item-details-box">
                <h3>Detalhes do Item Selecionado</h3>
                <div className="item-details">
                  <p><strong>Nome:</strong> {selectedItem.nome}</p>
                  <p><strong>Categoria:</strong> {selectedItem.categoria || 'N/A'}</p>
                  <p><strong>Preço:</strong> R$ {Number(selectedItem.valor).toFixed(2)}</p>
                  <p><strong>Tipo:</strong> {selectedItem.tipoQuantidade}</p>
                  <p><strong>Validade:</strong> {selectedItem.validade ? moment(selectedItem.validade).format('DD/MM/YYYY') : 'Sem validade'}</p>
                  <p><strong>Quantidade disponível:</strong> {selectedItem.quantidade} {selectedItem.tipoQuantidade}</p>
                </div>
              </div>
              <Form.Item label="Quantidade para Transferir">
                <Input
                  type="number"
                  min={1}
                  max={selectedItem ? selectedItem.quantidade : 0}
                  value={quantidadeTransferir}
                  onChange={(e) => setQuantidadeTransferir(Number(e.target.value))}
                  placeholder="Digite a quantidade"
                />
                <small style={{ display: 'block', marginTop: '5px' }}>
                  Disponível: {selectedItem?.quantidade} {selectedItem?.tipoQuantidade}
                </small>
              </Form.Item>
            </>
          )}
          <Form.Item label="Estoque de Destino">
            <Select
              placeholder="Selecione o estoque de destino"
              value={destinoStock}
              onChange={setDestinoStock}
              style={{ width: '100%' }}
            >
              {destinationOptions.map(stockKey => (
                <Select.Option key={stockKey} value={stockKey}>
                  {stockKey === "principal"
                    ? "Estoque Principal"
                    : stockKey === "vet"
                    ? "Estoque Vet"
                    : stockKey === "internacao"
                    ? "Internação"
                    : "Reposição de Consultorios"}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              onClick={handleTransfer} 
              disabled={isTransferring || !selectedItem || !destinoStock || quantidadeTransferir <= 0}
              loading={isTransferring}
              block
            >
              {isTransferring ? "Transferindo..." : "Transferir"}
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}

export default Transferencia; 
