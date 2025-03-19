import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Row, Col, List, Typography, Spin, Space, Tooltip, Modal, Divider, notification, Dropdown, Menu } from "antd";
import { useAuth } from "../context/AuthContext";
import { 
  HistoryOutlined, 
  ReloadOutlined, 
  ArrowRightOutlined, 
  ClearOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LogoutOutlined,
  ImportOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { obterRegistros, formatarMensagem } from "../services/registroService";
import { gerarRelatorioGeral } from "../services/relatorioService";
import "./Dashboard.css";

const { Title, Text } = Typography;

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [registrosRecentes, setRegistrosRecentes] = useState([]);
  const [carregandoRegistros, setCarregandoRegistros] = useState(true);
  const [relatorioVisivel, setRelatorioVisivel] = useState(false);
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [dataHoraAtual, setDataHoraAtual] = useState(new Date());

  useEffect(() => {
    carregarRegistrosRecentes();
    
    // Atualizar a data e hora a cada segundo
    const intervalo = setInterval(() => {
      setDataHoraAtual(new Date());
    }, 1000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalo);
  }, []);
  
  // Formatar a data atual em português do Brasil
  const formatarData = (data) => {
    const opcoes = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return data.toLocaleDateString('pt-BR', opcoes);
  };
  
  // Formatar a hora atual
  const formatarHora = (data) => {
    const opcoes = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    };
    return data.toLocaleTimeString('pt-BR', opcoes);
  };

  const carregarRegistrosRecentes = async () => {
    setCarregandoRegistros(true);
    try {
      const registros = await obterRegistros(10); // Obtém apenas os 10 registros mais recentes
      setRegistrosRecentes(registros);
    } catch (error) {
      console.error("Erro ao carregar registros:", error);
    } finally {
      setCarregandoRegistros(false);
    }
  };

  const formatarMensagemOperacao = (registro) => {
    const formatador = formatarMensagem[registro.tipoOperacao] || formatarMensagem.default;
    return formatador(registro);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Falha ao sair:", error);
    }
  };

  const limparRegistrosVisuais = () => {
    setRegistrosRecentes([]);
  };

  const gerarRelatorio = async () => {
    setRelatorioVisivel(true);
    try {
      // Usar o serviço de relatório para obter dados reais
      const relatorio = await gerarRelatorioGeral();
      setDadosRelatorio(relatorio);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      notification.error({
        message: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório. Tente novamente mais tarde."
      });
    }
  };

  const fecharRelatorio = () => {
    console.log("Fechando relatório");
    setRelatorioVisivel(false);
  };

  const imprimirRelatorio = () => {
    // Salvamos o conteúdo da página atual
    const conteudoOriginal = document.body.innerHTML;
    
    // Pegamos apenas o conteúdo do relatório
    const conteudoImpressao = document.getElementById('relatorio-para-impressao').innerHTML;
    
    // Substituímos o conteúdo da página pelo relatório
    document.body.innerHTML = conteudoImpressao;
    
    // Imprimimos
    window.print();
    
    // Restauramos o conteúdo original
    document.body.innerHTML = conteudoOriginal;
    
    // Re-renderizamos o componente para restaurar os eventos
    setTimeout(() => {
      setRelatorioVisivel(true);
    }, 100);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Vitale Controle de Estoque</h1>
          <div className="data-hora-container">
            <div className="data-container">
              <CalendarOutlined />
              <span>{formatarData(dataHoraAtual)}</span>
            </div>
            <div className="hora-container">
              <ClockCircleOutlined />
              <span>{formatarHora(dataHoraAtual)}</span>
            </div>
          </div>
        </div>
        <div className="user-info">
          <span>Olá, {currentUser?.email}</span>
          <Space>
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item 
                    key="relatorio" 
                    icon={<FileTextOutlined />}
                    onClick={gerarRelatorio}
                  >
                    Gerar Relatório
                  </Menu.Item>
                  <Menu.Item 
                    key="importacao" 
                    icon={<ImportOutlined />}
                    onClick={() => navigate("/importacao-csv")}
                  >
                    Importar Dados (CSV)
                  </Menu.Item>
                </Menu>
              }
              placement="bottomRight"
              trigger={["click"]}
            >
              <Button 
                icon={<SettingOutlined />} 
                className="btn-padrao btn-settings"
                type="default"
              />
            </Dropdown>
            <Button icon={<LogoutOutlined />} className="btn-padrao" onClick={handleLogout}>Sair</Button>
          </Space>
        </div>
      </div>

      <div className="dashboard-content">
        <Row gutter={[32, 24]} justify="center">
          <Col xs={24} sm={12} lg={6}>
            <h3 className="dashboard-section-title">Estoque Principal</h3>
            <Card 
              className="dashboard-card"
              onClick={() => navigate("/estoque-principal")}
              hoverable
            >
              <div className="dashboard-card-content">
                <p>Gerenciar itens do estoque principal</p>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <h3 className="dashboard-section-title">Estoque Vet</h3>
            <Card 
              className="dashboard-card"
              onClick={() => navigate("/estoque-vet")}
              hoverable
            >
              <div className="dashboard-card-content">
                <p>Gerenciar itens veterinários</p>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <h3 className="dashboard-section-title">Internação</h3>
            <Card 
              className="dashboard-card"
              onClick={() => navigate("/estoque-internacao")}
              hoverable
            >
              <div className="dashboard-card-content">
                <p>Gerenciar itens de internação</p>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <h3 className="dashboard-section-title">Reposição</h3>
            <Card 
              className="dashboard-card"
              onClick={() => navigate("/estoque-reposicao")}
              hoverable
            >
              <div className="dashboard-card-content">
                <p>Gerenciar itens de reposição de consultórios</p>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Nova seção de registros integrada ao Dashboard */}
        <Row gutter={[32, 24]} style={{ marginTop: '32px' }} justify="center">
          <Col xs={24}>
            <h3 className="dashboard-section-title">
              Registros Recentes
              <Space style={{ marginLeft: 8 }}>
                <Tooltip title="Atualizar">
                  <Button 
                    type="text" 
                    icon={<ReloadOutlined />} 
                    onClick={carregarRegistrosRecentes} 
                    loading={carregandoRegistros}
                    className="btn-icone"
                  />
                </Tooltip>
                <Tooltip title="Limpar registros">
                  <Button 
                    type="text" 
                    icon={<ClearOutlined />} 
                    onClick={limparRegistrosVisuais} 
                    disabled={registrosRecentes.length === 0}
                    className="btn-icone"
                  />
                </Tooltip>
              </Space>
            </h3>
            <Card className="dashboard-registros-card">
              <div className="dashboard-registros-header">
                <Space>
                  <HistoryOutlined className="registros-icon" />
                  <Title level={4} style={{ margin: 0 }}>Últimas Atividades</Title>
                </Space>
                <Button 
                  type="primary" 
                  onClick={() => navigate("/registros")}
                  icon={<ArrowRightOutlined />}
                  className="btn-padrao"
                >
                  Ver Todos
                </Button>
              </div>

              {carregandoRegistros ? (
                <div className="dashboard-registros-loading">
                  <Spin />
                  <Text>Carregando atividades recentes...</Text>
                </div>
              ) : registrosRecentes.length === 0 ? (
                <div className="dashboard-registros-vazio">
                  <Text type="secondary">Nenhuma atividade para exibir</Text>
                  <Button 
                    type="link" 
                    onClick={carregarRegistrosRecentes}
                    icon={<ReloadOutlined />}
                    className="btn-link"
                  >
                    Recarregar
                  </Button>
                </div>
              ) : (
                <List
                  dataSource={registrosRecentes}
                  renderItem={(registro) => (
                    <List.Item className="dashboard-registro-item">
                      <div className="dashboard-registro-conteudo">
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {registro.dataFormatada}
                        </Text>
                        <Text>{formatarMensagemOperacao(registro)}</Text>
                      </div>
                    </List.Item>
                  )}
                  locale={{ emptyText: "Nenhuma atividade registrada" }}
                  className="dashboard-registros-lista"
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modal de Relatório */}
      <Modal
        title="Relatório Geral de Estoque"
        open={relatorioVisivel}
        onCancel={fecharRelatorio}
        width={1000}
        maskClosable={true}
        destroyOnClose={true}
        closable={true}
        centered={true}
        footer={
          <div className="relatorio-footer">
            <Button 
              key="fechar" 
              onClick={fecharRelatorio} 
              className="btn-padrao btn-relatorio"
            >
              Fechar
            </Button>
            <Button 
              key="imprimir" 
              type="primary" 
              icon={<PrinterOutlined />} 
              onClick={imprimirRelatorio}
              className="btn-padrao btn-relatorio"
            >
              Imprimir
            </Button>
          </div>
        }
      >
        <div id="relatorio-para-impressao" className="relatorio-conteudo">
          <div className="relatorio-cabecalho">
            <h1>Vitale Controle de Estoque</h1>
            <h2>Relatório Geral de Movimentação</h2>
            <p className="relatorio-data">Data: {dadosRelatorio?.dataGeracao}</p>
          </div>

          <Divider />
          
          <div className="relatorio-secao">
            <h3>Produtos com Maior Entrada</h3>
            <div className="relatorio-tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio?.itensMaisEntradas.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome}</td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.valor.toFixed(2)}</td>
                      <td>R$ {(item.quantidade * item.valor).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relatorio-secao">
            <h3>Produtos com Menor Entrada</h3>
            <div className="relatorio-tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio?.itensMenosEntradas.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome}</td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.valor.toFixed(2)}</td>
                      <td>R$ {(item.quantidade * item.valor).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relatorio-secao">
            <h3>Produtos com Maior Saída</h3>
            <div className="relatorio-tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio?.itensMaisSaidas.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome}</td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.valor.toFixed(2)}</td>
                      <td>R$ {(item.quantidade * item.valor).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="relatorio-secao">
            <h3>Produtos com Menor Saída</h3>
            <div className="relatorio-tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Valor Unitário</th>
                    <th>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRelatorio?.itensMenosSaidas.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome}</td>
                      <td>{item.quantidade}</td>
                      <td>R$ {item.valor.toFixed(2)}</td>
                      <td>R$ {(item.quantidade * item.valor).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Divider />

          <div className="relatorio-resumo">
            <h3>Resumo Financeiro</h3>
            <p><strong>Custo Total do Estoque:</strong> R$ {dadosRelatorio?.custoTotal.toFixed(2)}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Dashboard;