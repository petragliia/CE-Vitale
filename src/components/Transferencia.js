import React, { useState, useEffect, useCallback } from "react";
import { Select, Button, Form, notification, Spin, Row, Col, Card, Modal, Space, InputNumber, Divider } from "antd";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import moment from "moment";
import { ReloadOutlined, SwapOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { stocks } from "../stocks";
import "./Transferencia.css";
import "./item-details-box.css";
import { registrarOperacao } from "../services/registroService";
import { useAuth } from "../context/AuthContext";

function Transferencia({ sourceStock, onBack, visible, onCancel }) {
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
      // Ordenar itens por nome para facilitar a busca
      list.sort((a, b) => a.nome.localeCompare(b.nome));
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
    if (visible) {
      setSelectedItem(null); // Resetar item selecionado quando abrir o modal
      setDestinoStock(null); // Resetar destino quando abrir o modal
      setQuantidadeTransferir(0); // Resetar quantidade quando abrir o modal
      fetchItems();
    }
  }, [fetchItems, visible, sourceStock]);

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
        <div className="transferencia-header">
          <SwapOutlined className="transferencia-icon" />
          <span>Transferência de Itens de {getStockDisplayName(sourceStock)}</span>
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose={true}
      maskClosable={false}
      className="transferencia-modal"
    >
      <Card
        className="transferencia-card"
        title={null}
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={isLoading}
            >
              Atualizar
            </Button>
          </Space>
        }
      >
        {isLoading ? (
          <div className="loading-container">
            <Spin size="large" />
            <p>Carregando itens...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum item disponível para transferência neste estoque.</p>
          </div>
        ) : (
          <Form layout="vertical" className="transferencia-form">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item 
                  label="Item para Transferir" 
                  required
                  tooltip="Selecione o produto que deseja transferir"
                >
                  <Select
                    placeholder="Selecione um item"
                    value={selectedItem ? selectedItem.id : undefined}
                    onChange={(value) => {
                      const item = items.find(i => i.id === value);
                      setSelectedItem(item);
                      setQuantidadeTransferir(0); // Reset quantidade ao mudar item
                    }}
                    className="form-field-padronizado"
                    optionLabelProp="label"
                    listHeight={320}
                    showSearch
                    filterOption={(input, option) =>
                      option.children[0].props.children[0].props.children.toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ width: '100%' }}
                  >
                    {items.map(item => (
                      <Select.Option 
                        key={item.id} 
                        value={item.id}
                        label={item.nome}
                      >
                        <div className="transferencia-item-info">
                          <strong>{item.nome}</strong>
                          <div className="transferencia-item-details">
                            <div><span className="detail-label">Quantidade:</span> {item.quantidade} {item.tipoQuantidade}</div>
                            {item.categoria && <div><span className="detail-label">Categoria:</span> {item.categoria}</div>}
                            <div><span className="detail-label">Preço:</span> R$ {Number(item.valor).toFixed(2)}</div>
                            <div><span className="detail-label">Validade:</span> {item.validade ? moment(item.validade).format('DD/MM/YYYY') : 'Sem validade'}</div>
                          </div>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} sm={24} md={12} lg={12} xl={12}>
                <Form.Item 
                  label="Destino" 
                  required
                  tooltip="Selecione o estoque para onde o item será transferido"
                >
                  <Select
                    placeholder="Selecione o estoque de destino"
                    value={destinoStock}
                    onChange={setDestinoStock}
                    className="form-field-padronizado"
                    style={{ width: '100%' }}
                  >
                    {destinationOptions.map(key => (
                      <Select.Option key={key} value={key}>
                        {getStockDisplayName(key)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {selectedItem && (
              <>
                <Divider orientation="left">Detalhes do Item Selecionado</Divider>
                <div className="item-details-box">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Nome:</span>
                        <span className="detail-value">{selectedItem.nome}</span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Categoria:</span>
                        <span className="detail-value">{selectedItem.categoria || 'N/A'}</span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Disponível:</span>
                        <span className="detail-value highlight">{selectedItem.quantidade} {selectedItem.tipoQuantidade}</span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Validade:</span>
                        <span className="detail-value">{selectedItem.validade ? moment(selectedItem.validade).format('DD/MM/YYYY') : 'Sem validade'}</span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Valor:</span>
                        <span className="detail-value">R$ {Number(selectedItem.valor).toFixed(2)}</span>
                      </div>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                      <div className="detail-item">
                        <span className="detail-label">Fornecedor:</span>
                        <span className="detail-value">{selectedItem.fornecedor || 'N/A'}</span>
                      </div>
                    </Col>
                  </Row>
                </div>

                <Form.Item 
                  label="Quantidade a Transferir" 
                  required
                  tooltip="Informe a quantidade que deseja transferir. Deve ser menor ou igual à quantidade disponível."
                >
                  <InputNumber
                    min={1}
                    max={selectedItem.quantidade}
                    value={quantidadeTransferir}
                    onChange={setQuantidadeTransferir}
                    style={{ width: '100%' }}
                    addonAfter={selectedItem.tipoQuantidade}
                  />
                </Form.Item>
              </>
            )}

            <div className="form-actions">
              <Row gutter={16}>
                <Col span={12}>
                  <Button 
                    onClick={onCancel}
                    size="large"
                    block
                  >
                    Cancelar
                  </Button>
                </Col>
                <Col span={12}>
                  <Button 
                    type="primary" 
                    onClick={handleTransfer} 
                    loading={isTransferring}
                    disabled={!selectedItem || !destinoStock || quantidadeTransferir <= 0}
                    icon={<ArrowRightOutlined />}
                    size="large"
                    block
                  >
                    Transferir Item
                  </Button>
                </Col>
              </Row>
            </div>
          </Form>
        )}
      </Card>
    </Modal>
  );
}

export default Transferencia;
