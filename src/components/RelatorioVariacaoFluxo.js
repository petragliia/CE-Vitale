import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tabs, Spin, Alert, Button, Tag, Tooltip, Statistic, Row, Col, Descriptions } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ReloadOutlined, 
  PrinterOutlined,
  WarningOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { analisarVariacaoFluxo, calcularEstatisticasMensais } from '../services/relatorioService';
import { useNavigate } from 'react-router-dom';
import './RelatorioVariacaoFluxo.css';

const { Text } = Typography;

function RelatorioVariacaoFluxo() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [estatisticasMensais, setEstatisticasMensais] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    setErro(null);
    
    try {
      const dadosVariacao = await analisarVariacaoFluxo();
      setDadosRelatorio(dadosVariacao);
      
      const estatisticas = await calcularEstatisticasMensais();
      setEstatisticasMensais(estatisticas);
    } catch (error) {
      console.error("Erro ao carregar dados de variação:", error);
      setErro("Não foi possível carregar os dados. Por favor, tente novamente mais tarde.");
    } finally {
      setCarregando(false);
    }
  };

  const imprimirRelatorio = () => {
    const conteudoOriginal = document.body.innerHTML;
    const conteudoImpressao = document.getElementById('relatorio-variacao').innerHTML;
    
    document.body.innerHTML = conteudoImpressao;
    window.print();
    document.body.innerHTML = conteudoOriginal;
    
    setTimeout(() => {
      // Re-renderizar componente
      carregarDados();
    }, 100);
  };

  // Colunas para a tabela de variação
  const colunas = [
    {
      title: 'Item',
      dataIndex: 'nome',
      key: 'nome',
      render: (texto, registro) => (
        <Text strong>{texto}</Text>
      )
    },
    {
      title: 'Mês Atual',
      dataIndex: 'quantidadeAtual',
      key: 'quantidadeAtual',
      align: 'center'
    },
    {
      title: 'Mês Anterior',
      dataIndex: 'quantidadeAnterior',
      key: 'quantidadeAnterior',
      align: 'center'
    },
    {
      title: 'Variação',
      dataIndex: 'variacao',
      key: 'variacao',
      align: 'center',
      render: (valor, registro) => (
        <Text style={{ color: valor > 0 ? '#52c41a' : '#f5222d' }}>
          {valor > 0 ? '+' : ''}{valor}
        </Text>
      )
    },
    {
      title: 'Variação %',
      dataIndex: 'percentual',
      key: 'percentual',
      align: 'center',
      render: (valor) => {
        const isPositive = valor > 0;
        const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />;
        const color = isPositive ? 'green' : 'red';
        
        return (
          <Tag color={color} icon={icon}>
            {Math.abs(valor)}%
          </Tag>
        );
      },
      sorter: (a, b) => Math.abs(b.percentual) - Math.abs(a.percentual)
    },
    {
      title: 'Alerta',
      key: 'alerta',
      align: 'center',
      render: (_, registro) => {
        // Destacar itens com variação acima de 30%
        const temAlerta = Math.abs(registro.percentual) > 30;
        
        if (!temAlerta) return null;
        
        return (
          <Tooltip title={`Variação significativa de ${Math.abs(registro.percentual)}%`}>
            <WarningOutlined style={{ color: '#faad14', fontSize: '18px' }} />
          </Tooltip>
        );
      }
    }
  ];

  // Items para o componente Tabs
  const getTabItems = () => {
    if (!dadosRelatorio) return [];
    
    const { variacoesEntrada, variacoesSaida } = dadosRelatorio;
    
    return [
      {
        key: "saidas",
        label: (
          <span>
            <ArrowDownOutlined />
            Saídas de Produtos
          </span>
        ),
        children: (
          <Card className="relatorio-card">
            <Table
              dataSource={variacoesSaida}
              columns={colunas}
              rowKey="nome"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Nenhuma variação significativa encontrada' }}
            />
          </Card>
        )
      },
      {
        key: "entradas",
        label: (
          <span>
            <ArrowUpOutlined />
            Entradas de Produtos
          </span>
        ),
        children: (
          <Card className="relatorio-card">
            <Table
              dataSource={variacoesEntrada}
              columns={colunas}
              rowKey="nome"
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Nenhuma variação significativa encontrada' }}
            />
          </Card>
        )
      }
    ];
  };

  const renderEstatisticasMensais = () => {
    if (!estatisticasMensais || !estatisticasMensais.estoques) {
      return <Spin size="large" />;
    }

    return (
      <div>
        <h2>Estatísticas Mensais ({estatisticasMensais.mesReferencia})</h2>
        <div className="stats-cards-container">
          {Object.entries(estatisticasMensais.estoques).map(([nomeEstoque, dados]) => (
            <Card 
              key={nomeEstoque} 
              title={nomeEstoque} 
              className="estoque-stats-card"
              bordered={true}
            >
              <Descriptions title="Totais do Mês" bordered size="small">
                <Descriptions.Item label="Total de Produtos" span={3}>
                  {dados.totais.produtos}
                </Descriptions.Item>
                <Descriptions.Item label="Entradas" span={1}>
                  {dados.totais.entradas}
                </Descriptions.Item>
                <Descriptions.Item label="Saídas" span={1}>
                  {dados.totais.saidas}
                </Descriptions.Item>
                <Descriptions.Item label="Saldo" span={1}>
                  <span style={{ color: dados.totais.saldoMes >= 0 ? '#3f8600' : '#cf1322' }}>
                    {dados.totais.saldoMes}
                  </span>
                </Descriptions.Item>
              </Descriptions>
              
              <Row gutter={16} className="stats-row">
                <Col span={12}>
                  <Statistic
                    title="Média Entrada Diária"
                    value={dados.medias.entradaDiaria}
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<ArrowUpOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Média Saída Diária"
                    value={dados.medias.saidaDiaria}
                    precision={2}
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<ArrowDownOutlined />}
                  />
                </Col>
              </Row>
              
              <div className="produtos-stats">
                <div>
                  <h4>Produtos com Mais Entradas</h4>
                  <ul>
                    {dados.produtosComMaisEntrada.map((produto, index) => (
                      <li key={`entrada-${index}`}>
                        <span className="produto-nome">{produto.nome}</span>
                        <span className="produto-qtd">{produto.quantidade} un.</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Produtos com Mais Saídas</h4>
                  <ul>
                    {dados.produtosComMaisSaida.map((produto, index) => (
                      <li key={`saida-${index}`}>
                        <span className="produto-nome">{produto.nome}</span>
                        <span className="produto-qtd">{produto.quantidade} un.</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (carregando) {
    return (
      <div className="relatorio-carregando">
        <Spin size="large" />
        <Text>Carregando relatório de variação...</Text>
      </div>
    );
  }

  if (erro) {
    return (
      <Alert
        message="Erro"
        description={erro}
        type="error"
        showIcon
        action={
          <Button onClick={carregarDados} icon={<ReloadOutlined />}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!dadosRelatorio) {
    return (
      <Alert
        message="Sem dados"
        description="Não há dados disponíveis para análise."
        type="info"
        showIcon
      />
    );
  }

  const { periodoAtual, periodoAnterior } = dadosRelatorio;

  return (
    <div className="relatorio-variacao-container">
      <div className="header-container">
        <Button 
          type="primary" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate("/dashboard")}
          style={{ marginRight: '20px' }}
          className="btn-voltar"
        >
          Voltar
        </Button>
        <h1>Relatório de Variação de Fluxo</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={carregarDados}
            className="btn-atualizar"
            style={{ marginRight: '10px' }}
          >
            Atualizar
          </Button>
          <Button 
            icon={<PrinterOutlined />} 
            onClick={imprimirRelatorio}
            className="btn-imprimir"
          >
            Imprimir
          </Button>
        </div>
      </div>

      <div id="relatorio-variacao">
        <Card className="relatorio-info-card">
          <div className="periodo-info">
            <div className="periodo-atual">
              <Text strong>Período Atual:</Text>
              <Text>{periodoAtual.nome} ({periodoAtual.inicio} a {periodoAtual.fim})</Text>
            </div>
            <div className="periodo-anterior">
              <Text strong>Período Anterior:</Text>
              <Text>{periodoAnterior.nome} ({periodoAnterior.inicio} a {periodoAnterior.fim})</Text>
            </div>
          </div>
        </Card>

        <Tabs 
          defaultActiveKey="saidas" 
          className="relatorio-tabs"
          items={getTabItems()}
        />

        <Tabs.TabPane tab="Estatísticas Mensais" key="estatisticas">
          {renderEstatisticasMensais()}
        </Tabs.TabPane>
      </div>
    </div>
  );
}

export default RelatorioVariacaoFluxo; 