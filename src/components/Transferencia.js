import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, Form, notification, Spin, Row, Col, Modal, InputNumber, Divider, Input } from "antd";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import moment from "moment";
import { ReloadOutlined, SwapOutlined, ArrowRightOutlined, PlusOutlined, MinusOutlined, SearchOutlined } from "@ant-design/icons";
import { stocks } from "../stocks";
import "./Transferencia.css";
import { registrarOperacao } from "../services/registroService";
import { useAuth } from "../context/AuthContext";

function Transferencia({ sourceStock, onBack, visible, onCancel }) {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [destinoStock, setDestinoStock] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantidadeTransferir, setQuantidadeTransferir] = useState(0);
  const [searchText, setSearchText] = useState("");
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
      // Ordenar itens por nome para facilitar a busca
      list.sort((a, b) => a.nome.localeCompare(b.nome));
      setItems(list);
      setFilteredItems(list);
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
    if (visible) {
      setSelectedItem(null); // Resetar item selecionado quando abrir o modal
      setDestinoStock(null); // Resetar destino quando abrir o modal
      setQuantidadeTransferir(0); // Resetar quantidade quando abrir o modal
      setSearchText(""); // Resetar busca quando abrir o modal
      fetchItems();
    }
  }, [fetchItems, visible, sourceStock]);
  
  // Filtrar itens quando o texto de busca mudar
  useEffect(() => {
    if (searchText.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => 
        item.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.categoria && item.categoria.toLowerCase().includes(searchText.toLowerCase())) ||
        (item.fornecedor && item.fornecedor.toLowerCase().includes(searchText.toLowerCase()))
      );
      setFilteredItems(filtered);
    }
  }, [searchText, items]);

  const handleRefresh = () => {
    setSelectedItem(null);
    setQuantidadeTransferir(0);
    setSearchText("");
    fetchItems();
  };
  
  const handleIncreaseQuantity = () => {
    if (selectedItem && quantidadeTransferir < selectedItem.quantidade) {
      setQuantidadeTransferir(prev => prev + 1);
    }
  };
  
  const handleDecreaseQuantity = () => {
    if (quantidadeTransferir > 1) {
      setQuantidadeTransferir(prev => prev - 1);
    }
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
      let sourceDocRef;
      let sourceDocSnap;
      
      try {
        // Primeiro tentar buscar pelo ID
        sourceDocRef = doc(db, sourceCollection, selectedItem.id);
        sourceDocSnap = await getDoc(sourceDocRef);
        
        // Se não encontrar pelo ID, tentar buscar pelo nome e outros atributos para resolver o problema de transferência
        if (!sourceDocSnap.exists()) {
          console.log("Item não encontrado pelo ID. Tentando buscar por nome...");
          const q = query(
            collection(db, sourceCollection),
            where("nome", "==", selectedItem.nome)
          );
          
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            // Encontrou pelo menos um documento com o mesmo nome
            const firstDoc = querySnapshot.docs[0];
            sourceDocRef = doc(db, sourceCollection, firstDoc.id);
            sourceDocSnap = await getDoc(sourceDocRef);
            console.log("Item encontrado por nome:", sourceDocSnap.data());
          } else {
            throw new Error("Item não encontrado no estoque");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar item:", error);
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
      setDestinoStock(null);
      await fetchItems(); // Recarregar itens atualizados
      
      // Fechar modal após transferência bem-sucedida
      if (onCancel) {
        onCancel();
      }
      
    } catch (error) {
      console.error("Erro na transferência:", error);
      notification.error({ 
        message: "Falha na transferência", 
        description: error.message 
      });
    }
    setIsTransferring(false);
  };

  const getStockDisplayName = (stockKey) => {
    const displayNames = {
      'principal': 'Estoque Principal',
      'vet': 'Estoque Veterinário',
      'internacao': 'Estoque Internação',
      'reposicao': 'Estoque Reposição Consultórios'
    };
    return displayNames[stockKey] || stockKey;
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center', width: '100%' }}>
          <SwapOutlined style={{ marginRight: '10px' }} />
          <span>Transferência de Itens</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      styles={{ body: { padding: '16px' } }}
      destroyOnClose={true}
      maskClosable={false}
      centered
    >
      <div style={{ padding: '0px 10px' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={isLoading}
          >
            Atualizar
          </Button>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin size="large" />
            <p>Carregando itens...</p>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Nenhum item disponível para transferência neste estoque.</p>
          </div>
        ) : (
          <div>
            <Form layout="vertical">
              <Form.Item 
                label="Item para Transferir" 
                required
                tooltip="Selecione o produto que deseja transferir"
              >
                <div style={{ marginBottom: '15px' }}>
                  <Input
                    placeholder="Buscar por nome, categoria ou fornecedor"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </div>
                <Select
                  placeholder="Selecione um item"
                  value={selectedItem ? selectedItem.id : undefined}
                  onChange={(value) => {
                    const item = items.find(i => i.id === value);
                    setSelectedItem(item);
                    setQuantidadeTransferir(1); // Iniciar com 1 ao selecionar item
                  }}
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                >
                  {filteredItems.map(item => (
                    <Select.Option 
                      key={item.id} 
                      value={item.id}
                      label={item.nome}
                    >
                      <div>
                        <strong>{item.nome}</strong> 
                        <div style={{fontSize: '12px', color: '#666'}}>
                          Qtd: {item.quantidade} {item.tipoQuantidade} | 
                          {item.validade && ` Val: ${moment(item.validade).format('DD/MM/YYYY')} | `}
                          {item.categoria && ` ${item.categoria} | `}
                          R$ {Number(item.valor).toFixed(2)}
                        </div>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item 
                label="Destino" 
                required
                tooltip="Selecione o estoque para onde o item será transferido"
              >
                <Select
                  placeholder="Selecione o estoque de destino"
                  value={destinoStock}
                  onChange={setDestinoStock}
                  style={{ width: '100%' }}
                >
                  {destinationOptions.map(key => (
                    <Select.Option key={key} value={key}>
                      {getStockDisplayName(key)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {selectedItem && (
                <div style={{ textAlign: 'center' }}>
                  <Divider>Detalhes do Item</Divider>
                  <div style={{ width: '100%', margin: '0 auto 20px', padding: '16px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <Row gutter={[16, 8]}>
                      <Col xs={12}>
                        <div style={{marginBottom: '10px'}}>
                          <div style={{fontWeight: 'bold', color: '#1976d2'}}>Nome:</div>
                          <div>{selectedItem.nome}</div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div style={{marginBottom: '10px'}}>
                          <div style={{fontWeight: 'bold', color: '#1976d2'}}>Categoria:</div>
                          <div>{selectedItem.categoria || 'N/A'}</div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div style={{marginBottom: '10px'}}>
                          <div style={{fontWeight: 'bold', color: '#1976d2'}}>Disponível:</div>
                          <div style={{fontWeight: 'bold'}}>{selectedItem.quantidade} {selectedItem.tipoQuantidade}</div>
                        </div>
                      </Col>
                      <Col xs={12}>
                        <div style={{marginBottom: '10px'}}>
                          <div style={{fontWeight: 'bold', color: '#1976d2'}}>Validade:</div>
                          <div>{selectedItem.validade ? moment(selectedItem.validade).format('DD/MM/YYYY') : 'Sem validade'}</div>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  <Form.Item 
                    label="Quantidade a Transferir" 
                    required
                    tooltip="Informe a quantidade que deseja transferir"
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Button 
                      icon={<MinusOutlined />} 
                      onClick={handleDecreaseQuantity}
                      disabled={quantidadeTransferir <= 1}
                    />
                    <InputNumber
                      min={1}
                      max={selectedItem.quantidade}
                      value={quantidadeTransferir}
                      onChange={setQuantidadeTransferir}
                      style={{ width: '100%', margin: '0 8px' }}
                      controls={false}
                      className="simplified-input-number"
                    />
                    <Button 
                      icon={<PlusOutlined />} 
                      onClick={handleIncreaseQuantity}
                      disabled={quantidadeTransferir >= selectedItem.quantidade}
                    />
                    <div style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>
                      {selectedItem.tipoQuantidade}
                    </div>
                  </Form.Item>
                </div>
              )}

              <div style={{ margin: '20px 0' }}>
                <Button 
                  type="primary" 
                  disabled={!selectedItem || !destinoStock || quantidadeTransferir <= 0 || isTransferring}
                  onClick={handleTransfer}
                  loading={isTransferring}
                  icon={<ArrowRightOutlined />}
                  block
                >
                  Transferir {quantidadeTransferir > 0 ? quantidadeTransferir : ''} {selectedItem ? selectedItem.tipoQuantidade : ''}
                </Button>
                
                <Button 
                  onClick={onCancel || onBack} 
                  block 
                  style={{marginTop: '10px'}}
                >
                  {onBack ? "Voltar" : "Cancelar"}
                </Button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default Transferencia;
