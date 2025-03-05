import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, Form, notification } from "antd";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import moment from "moment";
import { stocks } from "../stocks";
import "./Transferencia.css";

function Transferencia({ sourceStock, onBack }) {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destinoStock, setDestinoStock] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const sourceCollection = stocks[sourceStock];
  const destinationOptions = Object.keys(stocks).filter(key => key !== sourceStock);

  const fetchItems = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, sourceCollection));
      const list = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validade: doc.data().validade?.toDate() // Converter Timestamp para Date
      }));
      setItems(list);
    } catch (error) {
      notification.error({ message: "Erro ao carregar itens", description: error.message });
    }
  }, [sourceCollection]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleTransfer = async () => {
    if (!selectedItem || !destinoStock) {
      notification.warning({ message: "Selecione um item e um destino!" });
      return;
    }

    setIsTransferring(true);
    try {
      const destinationCollection = stocks[destinoStock];
      const destinationQuery = await getDocs(collection(db, destinationCollection));
      
      // Procurar item existente
      const existingDoc = destinationQuery.docs.find(d => {
        const data = d.data();
        return (
          data.nome === selectedItem.nome &&
          moment(data.validade?.toDate()).isSame(selectedItem.validade, 'day') &&
          data.tipoQuantidade === selectedItem.tipoQuantidade
        );
      });

      // Atualizar ou criar novo
      if (existingDoc) {
        await updateDoc(doc(db, destinationCollection, existingDoc.id), {
          quantidade: Number(existingDoc.data().quantidade) + Number(selectedItem.quantidade)
        });
      } else {
        await addDoc(collection(db, destinationCollection), {
          ...selectedItem,
          validade: selectedItem.validade,
          transferredAt: serverTimestamp()
        });
      }

      // Remover da origem
      await deleteDoc(doc(db, sourceCollection, selectedItem.id));
      
      notification.success({ message: "Transferência concluída!" });
      setSelectedItem(null);
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
      <Button onClick={onBack} style={{ marginBottom: "20px" }}>
        Voltar
      </Button>
      <Form layout="vertical">
        <Form.Item label="Item para Transferir">
          <Select
            placeholder="Selecione um item"
            value={selectedItem ? selectedItem.id : undefined}
            onChange={(value) => {
              const item = items.find(i => i.id === value);
              setSelectedItem(item);
            }}
          >
            {items.map(item => (
              <Select.Option key={item.id} value={item.id}>
                {item.nome} - Quantidade: {item.quantidade} - Tipo: {item.tipoQuantidade}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Estoque de Destino">
          <Select
            placeholder="Selecione o estoque de destino"
            value={destinoStock}
            onChange={setDestinoStock}
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
          <Button type="primary" onClick={handleTransfer} disabled={isTransferring}>
            {isTransferring ? "Transferindo..." : "Transferir"}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default Transferencia; 
