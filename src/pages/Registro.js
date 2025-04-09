import React, { useState, useEffect } from 'react';
import { Table, Typography, Space, Button, Input, Card, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { obterRegistros, formatarMensagem } from '../services/registroService';
import './Registro.css';

const { Title, Text } = Typography;

function Registro() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    carregarRegistros();
  }, []);

  useEffect(() => {
    if (registros.length) {
      setFilteredData(
        registros.filter(
          (registro) =>
            JSON.stringify(registro)
              .toLowerCase()
              .includes(searchText.toLowerCase())
        )
      );
    }
  }, [searchText, registros]);

  const carregarRegistros = async () => {
    setLoading(true);
    try {
      const dados = await obterRegistros(500); // Limitando a 500 registros
      setRegistros(dados);
      setFilteredData(dados);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarMensagemOperacao = (registro) => {
    const formatador = formatarMensagem[registro.tipoOperacao] || formatarMensagem.default;
    return formatador(registro);
  };

  const columns = [
    {
      title: 'Data',
      dataIndex: 'dataFormatada',
      key: 'dataFormatada',
      width: '15%',
      sorter: (a, b) => new Date(a.dataFormatada) - new Date(b.dataFormatada),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Usuário',
      dataIndex: 'usuarioEmail',
      key: 'usuarioEmail',
      width: '20%',
    },
    {
      title: 'Operação',
      key: 'operacao',
      width: '65%',
      render: (_, registro) => (
        <span>{formatarMensagemOperacao(registro)}</span>
      ),
    },
  ];

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const handleRefresh = () => {
    carregarRegistros();
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="registro-container">
      <Card className="registro-card">
        <div className="registro-header">
          <div className="registro-title">
            <HistoryOutlined className="registro-icon" />
            <Title level={2}>Registro de Operações</Title>
          </div>
          <Button type="primary" onClick={handleBack}>
            Voltar para Dashboard
          </Button>
        </div>

        <div className="registro-actions">
          <Space size="middle">
            <Input
              placeholder="Buscar..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={handleSearch}
              className="registro-search"
            />
            
            <Button 
              type="default" 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              Atualizar
            </Button>
          </Space>
        </div>

        {loading ? (
          <div className="registro-loading">
            <Spin size="large" />
            <Text>Carregando registros...</Text>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 20 }}
            className="registro-table"
          />
        )}
        
        <div className="registro-footer">
          <Text type="secondary">
            {filteredData.length} registros encontrados
          </Text>
        </div>
      </Card>
    </div>
  );
}

export default Registro; 