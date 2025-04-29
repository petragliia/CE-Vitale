import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Table, Button, Form, Modal, Input, DatePicker, Select, 
  Tooltip, Badge, Popconfirm, Tag, Space, 
  Empty, Drawer, message, AutoComplete
} from "antd";
import { 
  PlusOutlined, FilterOutlined, ReloadOutlined, 
  EditOutlined, DeleteOutlined, 
  LogoutOutlined,
  InboxOutlined, MedicineBoxOutlined, CoffeeOutlined, EyeOutlined,
  WarningOutlined, SwapOutlined, SearchOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from "chart.js";
import moment from "moment";
import { stocks } from "../stocks";
import "./ReposicaoConsultorios.css";
import "./estoques-comum.css";
import "./date-picker-mobile.css";
import { registrarOperacao } from "../services/registroService";
import Transferencia from './Transferencia';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

// Constantes para ícones de categoria
const CATEGORIA_ICONS = {
  Medicamentos: <MedicineBoxOutlined />,
  Insumos: <InboxOutlined />,
  Comida: <CoffeeOutlined />
};

// Configuração para notificações de estoque
const ESTOQUE_MINIMO = 5;
const ESTOQUE_BAIXO = 10;

function ReposicaoConsultorios() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    estoqueBaixo: 0,
    valorTotal: 0,
    porCategoria: {}
  });
  
  // Estado para gerenciar modais e drawers
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerDetalhesVisible, setDrawerDetalhesVisible] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [mostrarGrafico, setMostrarGrafico] = useState(true);
  const [form] = Form.useForm();
  const [transferenciaModalVisible, setTransferenciaModalVisible] = useState(false);
  
  // Estados para filtros
  const [filtroAvancado, setFiltroAvancado] = useState(false);
  const [filtros, setFiltros] = useState({
    nome: "",
    fornecedor: "",
    precoMin: "",
    precoMax: "",
    quantidadeMin: "",
    quantidadeMax: "",
    validadeOrdem: null,
    validadeInicio: null,
    validadeFim: null
  });
  
  // Coleção referente ao estoque principal
  const collectionName = stocks.reposicao;
  
  // Cores para categorias com melhor contraste
  const CORES_POR_CATEGORIA = useMemo(() => ({
    Medicamentos: "#3498db",
    Insumos: "#2ecc71",
    Comida: "#f39c12"
  }), []);
  
  // Função para aplicar filtros
  const aplicarFiltros = useCallback((termoBusca, filtrosAtivos, listaProdutos, categoria) => {
    let resultado = [...listaProdutos];
    
    // Filtro por termo de busca
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      resultado = resultado.filter(
        p => p.nome?.toLowerCase().includes(termo) || 
             p.fornecedor?.toLowerCase().includes(termo)
      );
    }
    
    // Filtro por categoria
    if (categoria && categoria !== "todos") {
      resultado = resultado.filter(p => p.categoria === categoria);
    }
    
    // Aplicar filtros avançados
    if (filtroAvancado) {
      // Filtro por nome
      if (filtrosAtivos.nome) {
        resultado = resultado.filter(p => 
          p.nome?.toLowerCase().includes(filtrosAtivos.nome.toLowerCase())
        );
      }
      
      // Filtro por fornecedor
      if (filtrosAtivos.fornecedor) {
        resultado = resultado.filter(p => 
          p.fornecedor?.toLowerCase().includes(filtrosAtivos.fornecedor.toLowerCase())
        );
      }
      
      // Filtro por preço mínimo
      if (filtrosAtivos.precoMin) {
        resultado = resultado.filter(p => 
          Number(p.valor) >= Number(filtrosAtivos.precoMin)
        );
      }
      
      // Filtro por preço máximo
      if (filtrosAtivos.precoMax) {
        resultado = resultado.filter(p => 
          Number(p.valor) <= Number(filtrosAtivos.precoMax)
        );
      }
      
      // Filtro por quantidade mínima
      if (filtrosAtivos.quantidadeMin) {
        resultado = resultado.filter(p => 
          Number(p.quantidade) >= Number(filtrosAtivos.quantidadeMin)
        );
      }
      
      // Filtro por quantidade máxima
      if (filtrosAtivos.quantidadeMax) {
        resultado = resultado.filter(p => 
          Number(p.quantidade) <= Number(filtrosAtivos.quantidadeMax)
        );
      }
      
      // Filtro por período de validade
      if (filtrosAtivos.validadeInicio && filtrosAtivos.validadeInicio) {
        resultado = resultado.filter(p => 
          p.validade && moment(p.validade).isAfter(filtrosAtivos.validadeInicio)
        );
      }
      
      if (filtrosAtivos.validadeFim) {
        resultado = resultado.filter(p => 
          p.validade && moment(p.validade).isBefore(filtrosAtivos.validadeFim)
        );
      }
      
      // Ordenação por validade
      if (filtrosAtivos.validadeOrdem) {
        resultado.sort((a, b) => {
          if (!a.validade) return 1;
          if (!b.validade) return -1;
          
          if (filtrosAtivos.validadeOrdem === 'asc') {
            return moment(a.validade).diff(moment(b.validade));
          } else {
            return moment(b.validade).diff(moment(a.validade));
          }
        });
      }
    }
    
    setProdutosFiltrados(resultado);
  }, [filtroAvancado]);
  
  // Função para buscar produtos
  const handleBusca = useCallback((valor) => {
    setBusca(valor);
    aplicarFiltros(valor, filtros, produtos, categoriaAtiva);
  }, [filtros, produtos, categoriaAtiva, aplicarFiltros]);
  
  // Função para obter sugestões de busca baseadas nos produtos existentes
  const getSugestoesBusca = useCallback(() => {
    // Extrair nomes únicos de produtos para sugestões
    const nomes = [...new Set(produtos.map(p => p.nome))];
    // Extrair fornecedores únicos para sugestões
    const fornecedores = [...new Set(produtos.map(p => p.fornecedor).filter(Boolean))];
    // Extrair categorias únicas para sugestões
    const categorias = [...new Set(produtos.map(p => p.categoria))];
    
    // Combinar todas as sugestões
    return [...nomes, ...fornecedores, ...categorias].slice(0, 10);
  }, [produtos]);
  
  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      nome: "",
      fornecedor: "",
      precoMin: "",
      precoMax: "",
      quantidadeMin: "",
      quantidadeMax: "",
      validadeOrdem: null,
      validadeInicio: null,
      validadeFim: null
    });
    setBusca("");
    setCategoriaAtiva("todos");
    aplicarFiltros("", {}, produtos, "todos");
  };

  // Calcular estatísticas
  const calcularEstatisticas = useCallback((produtosData) => {
    const estatisticasNovas = {
      total: produtosData.length,
      estoqueBaixo: produtosData.filter(p => p.quantidade < ESTOQUE_MINIMO).length,
      valorTotal: produtosData.reduce((total, p) => total + (p.valor * p.quantidade), 0),
      porCategoria: {}
    };
    
    // Calcular total por categoria
    produtosData.forEach(produto => {
      if (!estatisticasNovas.porCategoria[produto.categoria]) {
        estatisticasNovas.porCategoria[produto.categoria] = {
          quantidade: 0,
          valor: 0
        };
      }
      estatisticasNovas.porCategoria[produto.categoria].quantidade += produto.quantidade;
      estatisticasNovas.porCategoria[produto.categoria].valor += (produto.valor * produto.quantidade);
    });
    
    setEstatisticas(estatisticasNovas);
  }, []);

  // Carregar produtos do Firebase
  const carregarProdutos = useCallback(async () => {
    try {
      setCarregando(true);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const produtosData = querySnapshot.docs.map(doc => {
        const dados = doc.data();
        return {
          ...dados,
          id: doc.id,
          validade: dados.validade?.toDate(),
          quantidade: Number(dados.quantidade || 0),
          valor: Number(dados.valor || 0)
        };
      });
      
      setProdutos(produtosData);
      setProdutosFiltrados(produtosData);
      calcularEstatisticas(produtosData);
      
      // Verificar produtos com estoque baixo
      const produtosBaixos = produtosData.filter(p => p.quantidade < ESTOQUE_MINIMO);
      if (produtosBaixos.length > 0) {
        message.warning({
          content: `${produtosBaixos.length} produtos com estoque crítico!`,
          icon: <WarningOutlined style={{ color: "#faad14" }} />,
          duration: 5
        });
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      message.error(typeof error.message === 'string' ? `Erro ao carregar produtos: ${error.message}` : "Erro ao carregar produtos");
    } finally {
      setCarregando(false);
    }
  }, [collectionName, calcularEstatisticas]);

  // Carregar produtos ao iniciar
  useEffect(() => {
    if (currentUser) {
      carregarProdutos();
    }
  }, [currentUser, carregarProdutos]);

  // Funções CRUD
  const adicionarProduto = async (values) => {
    try {
      setCarregando(true);
      const dados = {
        ...values,
        validade: values.validade?.toDate(),
        quantidade: Number(values.quantidade),
        valor: Number(values.valor),
        userId: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, collectionName), dados);
      await registrarOperacao(
        currentUser.email,
        'adicao',
        values.nome,
        'Reposicao Consultorios',
        null,
        values.quantidade,
        {
          categoria: values.categoria,
          valor: values.valor,
          validade: values.validade ? moment(values.validade).format('DD/MM/YYYY') : 'N/A'
        }
      );
      
      message.success("Produto adicionado com sucesso!");
      await carregarProdutos();
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      message.error(typeof error.message === 'string' ? `Erro ao adicionar produto: ${error.message}` : "Erro ao adicionar produto");
    } finally {
      setCarregando(false);
    }
  };

  const editarProduto = (produto) => {
    setProdutoEditando(produto);
    form.setFieldsValue({
      ...produto,
      validade: produto.validade ? moment(produto.validade) : null
    });
    setModalVisible(true);
  };

  const atualizarProduto = async (values) => {
    try {
      if (!produtoEditando || !produtoEditando.id) {
        message.error("ID do produto não encontrado!");
        return;
      }
      
      setCarregando(true);
      const dados = {
        ...values,
        validade: values.validade?.toDate(),
        quantidade: Number(values.quantidade),
        valor: Number(values.valor),
        updatedAt: new Date()
      };
      
      const docRef = doc(db, collectionName, produtoEditando.id);
      await updateDoc(docRef, dados);
      
      await registrarOperacao(
        currentUser.email,
        'atualizacao',
        produtoEditando.nome,
        'Reposicao Consultorios',
        null,
        produtoEditando.quantidade,
        {
          categoria: produtoEditando.categoria,
          valor: produtoEditando.valor,
          validade: produtoEditando.validade ? moment(produtoEditando.validade).format('DD/MM/YYYY') : 'N/A'
        }
      );
      
      message.success("Produto atualizado com sucesso!");
      await carregarProdutos();
      setModalVisible(false);
      setProdutoEditando(null);
      form.resetFields();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      message.error(typeof error.message === 'string' ? `Erro ao atualizar produto: ${error.message}` : "Erro ao atualizar produto");
    } finally {
      setCarregando(false);
    }
  };

  const excluirProduto = async (id) => {
    try {
      setCarregando(true);
      console.log("Tentando excluir produto com ID:", id);
      console.log("Lista de produtos disponíveis:", produtos.map(p => ({ id: p.id, nome: p.nome })));
      
      // Convertendo ambos os IDs para string para garantir uma comparação consistente
      const produtoParaExcluir = produtos.find(p => String(p.id) === String(id));
      
      if (!produtoParaExcluir) {
        console.error(`Produto com ID ${id} não encontrado na lista de produtos.`);
        message.error(`Produto com ID ${id} não encontrado para exclusão. Tente recarregar a página.`);
        return;
      }
      
      console.log("Produto encontrado para exclusão:", produtoParaExcluir);
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      await registrarOperacao(
        currentUser.email,
        'remocao',
        produtoParaExcluir.nome,
        'Reposicao Consultorios',
        null,
        produtoParaExcluir.quantidade,
        {
          categoria: produtoParaExcluir.categoria,
          id: id
        }
      );
      
      message.success(`Produto "${produtoParaExcluir.nome}" excluído com sucesso!`);
      await carregarProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      message.error(typeof error.message === 'string' ? `Erro ao excluir produto: ${error.message}` : "Erro ao excluir produto");
    } finally {
      setCarregando(false);
    }
  };

  // Submeter formulário
  const handleSubmit = (values) => {
    if (produtoEditando) {
      atualizarProduto(values);
    } else {
      adicionarProduto(values);
    }
  };

  // Ver detalhes do produto
  const verDetalhesProduto = (produto) => {
    setProdutoSelecionado(produto);
    setDrawerDetalhesVisible(true);
  };

  // Componente para status de quantidade
  const StatusQuantidade = ({ quantidade }) => {
    if (quantidade <= ESTOQUE_MINIMO) {
      return <Tag color="error">Crítico</Tag>;
    } else if (quantidade <= ESTOQUE_BAIXO) {
      return <Tag color="warning">Baixo</Tag>;
    }
    return <Tag color="success">Normal</Tag>;
  };

  // Configuração para os gráficos
  const { dadosGrafico, opcoesGrafico } = useMemo(() => {
    const categorias = Object.keys(CORES_POR_CATEGORIA);
    const dados = categorias.map(categoria =>
      produtos.filter(p => p.categoria === categoria).reduce((sum, p) => sum + p.quantidade, 0)
    );
    
    return {
      dadosGrafico: {
        labels: categorias,
        datasets: [{
          label: "Quantidade Total",
          data: dados,
          backgroundColor: categorias.map(c => CORES_POR_CATEGORIA[c]),
          borderColor: "#ffffff",
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 50
        }]
      },
      opcoesGrafico: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            callbacks: { 
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} unidades` 
            }
          }
        },
        scales: {
          y: { 
            beginAtZero: true, 
            ticks: { precision: 0, color: "#666" }, 
            grid: { color: "#f0f0f0" } 
          },
          x: { 
            ticks: { color: "#444", font: { weight: "bold" } }, 
            grid: { display: false } 
          }
        }
      }
    };
  }, [produtos, CORES_POR_CATEGORIA]);

  // Renderizar tabela de produtos
  const colunas = [
    {
      title: "Nome",
      dataIndex: "nome",
      key: "nome",
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              backgroundColor: CORES_POR_CATEGORIA[record.categoria] || '#ccc', 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              marginRight: '8px'
            }} 
          />
          <span>{text}</span>
        </div>
      ),
      sorter: (a, b) => a.nome.localeCompare(b.nome)
    },
    {
      title: "Categoria",
      dataIndex: "categoria",
      key: "categoria",
      render: (text) => (
        <Tag color={CORES_POR_CATEGORIA[text] || '#ccc'} style={{ fontWeight: 500 }}>
          {CATEGORIA_ICONS[text]} {text}
        </Tag>
      ),
      filters: Object.keys(CORES_POR_CATEGORIA).map(cat => ({ text: cat, value: cat })),
      onFilter: (value, record) => record.categoria === value
    },
    {
      title: "Quantidade",
      dataIndex: "quantidade",
      key: "quantidade",
      render: (text) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
      sorter: (a, b) => a.quantidade - b.quantidade
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => <StatusQuantidade quantidade={record.quantidade} />
    },
    {
      title: "Preço (R$)",
      dataIndex: "valor",
      key: "valor",
      render: (text) => (
        <span>R$ {Number(text).toFixed(2)}</span>
      ),
      sorter: (a, b) => a.valor - b.valor
    },
    {
      title: "Validade",
      dataIndex: "validade",
      key: "validade",
      render: (date) => date ? moment(date).format("DD/MM/YYYY") : "-",
      sorter: (a, b) => {
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        return moment(a.validade).diff(moment(b.validade));
      }
    },
    {
      title: "Ações",
      key: "acoes",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalhes">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => verDetalhesProduto(record)}
              type="text" 
              size="small"
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => editarProduto(record)}
              type="text" 
              size="small"
            />
          </Tooltip>
          <Tooltip title="Excluir">
            <Popconfirm
              title="Tem certeza que deseja excluir este produto?"
              onConfirm={() => excluirProduto(record.id)}
              okText="Sim"
              cancelText="Não"
            >
              <Button 
                icon={<DeleteOutlined />} 
                type="text" 
                danger 
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // Renderização principal
  const handleOpenTransferencia = () => {
    setTransferenciaModalVisible(true);
  };

  const handleCloseTransferencia = () => {
    setTransferenciaModalVisible(false);
    // Recarregar produtos após fechar o modal de transferência
    carregarProdutos();
  };

  return (
    <div className="estoque-container">
      <div className="header-fixo">
        <div className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="logo"><InboxOutlined /></span>
              <h1>Reposicao Consultorios</h1>
            </div>
            <div className="header-actions">
              <Button
                onClick={() => navigate("/dashboard")}
                style={{ color: "white", marginRight: "10px" }}
              >
                Dashboard
              </Button>
              <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={logout}
                style={{ color: "white" }}
              >
                Sair
              </Button>
            </div>
          </div>
        </div>

        <div className="control-buttons">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setProdutoEditando(null);
              form.resetFields();
              setModalVisible(true);
            }}>
            Adicionar Produto
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={carregarProdutos}>
            Atualizar
          </Button>
          <Button 
            icon={<FilterOutlined />} 
            onClick={() => setFiltroAvancado(!filtroAvancado)}>
            {filtroAvancado ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Button 
            icon={<EyeOutlined />}
            onClick={() => setMostrarGrafico(!mostrarGrafico)}>
            {mostrarGrafico ? 'Ocultar Gráfico' : 'Mostrar Gráfico'}
          </Button>
          <Button 
            icon={<SwapOutlined />}
            onClick={handleOpenTransferencia}>
            Transferir
          </Button>
        </div>
      </div>

      <div className="control-bar">
        <div className="search-area">
          <div className="search-container" style={{ display: 'flex', width: '100%' }}>
            <AutoComplete
              style={{ flex: 1 }}
              value={busca}
              onChange={(value) => setBusca(value)}
              options={getSugestoesBusca().map((sugestao) => ({ value: sugestao }))}
              onSelect={(value) => handleBusca(value)}
              placeholder="Buscar por nome, código, fornecedor..."
              size="large"
            />
            <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={() => handleBusca(busca)}
              style={{ marginLeft: 8 }}
              size="large"
            >
              Buscar
            </Button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Filtros avançados */}
        {filtroAvancado && (
          <div className="filters-panel">
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Filtros Avançados</h3>
            <div className="filters-grid">
              <Form layout="vertical">
                <Form.Item label="Nome do Produto">
                  <Input
                    placeholder="Buscar por nome"
                    value={filtros.nome}
                    onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Fornecedor">
                  <Input
                    placeholder="Buscar por fornecedor"
                    value={filtros.fornecedor}
                    onChange={(e) => setFiltros({...filtros, fornecedor: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Preço Mínimo (R$)">
                  <Input
                    type="number"
                    placeholder="Preço mínimo"
                    value={filtros.precoMin}
                    onChange={(e) => setFiltros({...filtros, precoMin: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Preço Máximo (R$)">
                  <Input
                    type="number"
                    placeholder="Preço máximo"
                    value={filtros.precoMax}
                    onChange={(e) => setFiltros({...filtros, precoMax: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Quantidade Mínima">
                  <Input
                    type="number"
                    placeholder="Quantidade mínima"
                    value={filtros.quantidadeMin}
                    onChange={(e) => setFiltros({...filtros, quantidadeMin: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Quantidade Máxima">
                  <Input
                    type="number"
                    placeholder="Quantidade máxima"
                    value={filtros.quantidadeMax}
                    onChange={(e) => setFiltros({...filtros, quantidadeMax: e.target.value})}
                  />
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Ordenar por Validade">
                  <Select
                    placeholder="Selecione a ordem"
                    value={filtros.validadeOrdem}
                    onChange={(value) => setFiltros({...filtros, validadeOrdem: value})}
                    allowClear
                  >
                    <Select.Option value="asc">Do mais antigo ao mais recente</Select.Option>
                    <Select.Option value="desc">Do mais recente ao mais antigo</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
              <Form layout="vertical">
                <Form.Item label="Período de Validade">
                  <DatePicker.RangePicker
                    format="DD/MM/YYYY"
                    placeholder={["Data inicial", "Data final"]}
                    value={[filtros.validadeInicio, filtros.validadeFim]}
                    onChange={(dates) => {
                      setFiltros({
                        ...filtros, 
                        validadeInicio: dates ? dates[0] : null,
                        validadeFim: dates ? dates[1] : null
                      });
                    }}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Form>
            </div>
            <div className="filters-actions">
              <Button 
                onClick={() => {
                  aplicarFiltros(busca, filtros, produtos, categoriaAtiva);
                }}
                type="primary"
              >
                Aplicar Filtros
              </Button>
              <Button 
                onClick={limparFiltros}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        {/* Cards resumo */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Total de Produtos</h3>
                <div className="card-value">{estatisticas.total}</div>
              </div>
              <div className="card-icon blue">
                <InboxOutlined />
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Estoque Crítico</h3>
                <div className="card-value">{estatisticas.estoqueBaixo}</div>
              </div>
              <div className="card-icon red">
                <WarningOutlined />
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Valor Total em Estoque</h3>
                <div className="card-value">R$ {estatisticas.valorTotal.toFixed(2)}</div>
              </div>
              <div className="card-icon green">
                <span>R$</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        {mostrarGrafico && (
        <div className="chart-container">
          <div className="chart-header">
            <h3 className="chart-title">Estoque por Categoria</h3>
            <div className="chart-legend">
              {Object.entries(CORES_POR_CATEGORIA).map(([categoria, cor]) => (
                <div className="legend-item" key={categoria}>
                  <div 
                    className="legend-color" 
                    style={{ backgroundColor: cor }}
                  />
                  <span>{categoria}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-wrapper">
            <Bar data={dadosGrafico} options={opcoesGrafico} />
          </div>
        </div>
        )}

        {/* Tabela de produtos */}
        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">
              Lista de Produtos
              {busca && <small style={{ marginLeft: 10 }}>Resultados para: {busca}</small>}
            </h3>
            <div className="table-actions">
              <Badge 
                count={produtosFiltrados.length} 
                showZero 
                style={{ backgroundColor: CORES_POR_CATEGORIA.Medicamentos }}
              >
                <span style={{ marginRight: 8 }}>Resultados</span>
              </Badge>
            </div>
          </div>
          
          <Table
            columns={colunas}
            dataSource={produtosFiltrados}
            rowKey="id"
            loading={carregando}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} itens`
            }}
            locale={{
              emptyText: (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="Nenhum produto encontrado"
                />
              )
            }}
          />
        </div>
      </div>

      {/* Modal de adicionar/editar produto */}
      <Modal
        title={produtoEditando ? "Editar Produto" : "Novo Produto"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setProdutoEditando(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            quantidade: 0,
            valor: 0,
            tipoQuantidade: "unitario"
          }}
        >
          <div className="modal-grid">
            <Form.Item
              name="nome"
              label="Nome do Produto"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Input placeholder="Ex: Seringa 10ml" />
            </Form.Item>
            <Form.Item
              name="categoria"
              label="Categoria"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Select placeholder="Selecione...">
                <Select.Option value="Medicamentos">Medicamentos</Select.Option>
                <Select.Option value="Insumos">Insumos</Select.Option>
                <Select.Option value="Comida">Comida</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="tipoQuantidade"
              label="Tipo de Quantidade"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Select placeholder="Selecione...">
                <Select.Option value="unitario">Unitário</Select.Option>
                <Select.Option value="pacotes">Pacotes</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="quantidade"
              label="Quantidade em Estoque"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Input type="number" min={0} placeholder="Ex: 100" />
            </Form.Item>
            <Form.Item
              name="valor"
              label="Preço Unitário (R$)"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Input type="number" min={0} step={0.01} placeholder="Ex: 12.50" />
            </Form.Item>
            <Form.Item
              name="validade"
              label="Data de Validade"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                placeholder="Selecione a data"
                inputReadOnly={true}
              />
            </Form.Item>
            <Form.Item
              name="fornecedor"
              label="Fornecedor"
              rules={[{ required: true, message: "Campo obrigatório!" }]}
            >
              <Input placeholder="Ex: Distribuidora Médica ABC" />
            </Form.Item>
          </div>
          <Form.Item style={{ marginTop: 16, textAlign: 'right' }}>
            <Button onClick={() => {
              setModalVisible(false);
              setProdutoEditando(null);
              form.resetFields();
            }} style={{ marginRight: 8 }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {produtoEditando ? "Atualizar" : "Adicionar"} Produto
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Transferência */}
      <Transferencia 
        sourceStock="reposicao" 
        onCancel={handleCloseTransferencia}
        visible={transferenciaModalVisible}
      />

      {/* Drawer de detalhes do produto */}
      <Drawer
        title="Detalhes do Produto"
        placement="right"
        width={500}
        onClose={() => {
          setDrawerDetalhesVisible(false);
          setProdutoSelecionado(null);
        }}
        open={drawerDetalhesVisible}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => {
                setDrawerDetalhesVisible(false);
                editarProduto(produtoSelecionado);
              }}
            >
              Editar
            </Button>
          </Space>
        }
      >
        {produtoSelecionado && (
          <div>
            <div style={{ 
              padding: '16px 20px', 
              backgroundColor: 'var(--light)', 
              borderRadius: 'var(--border-radius)',
              marginBottom: '20px'
            }}>
              <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>{produtoSelecionado.nome}</h2>
              <Tag color={CORES_POR_CATEGORIA[produtoSelecionado.categoria]}>
                {CATEGORIA_ICONS[produtoSelecionado.categoria]} {produtoSelecionado.categoria}
              </Tag>
              <StatusQuantidade quantidade={produtoSelecionado.quantidade} />
            </div>
            
            <div className="item-details">
              <div className="detail-item">
                <span className="detail-label">Quantidade</span>
                <span className="detail-value">{produtoSelecionado.quantidade}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tipo</span>
                <span className="detail-value">
                  {produtoSelecionado.tipoQuantidade === 'unitario' ? 'Unitário' : 'Pacote'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Preço Unitário</span>
                <span className="detail-value">R$ {Number(produtoSelecionado.valor).toFixed(2)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valor Total</span>
                <span className="detail-value">
                  R$ {(produtoSelecionado.valor * produtoSelecionado.quantidade).toFixed(2)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fornecedor</span>
                <span className="detail-value">{produtoSelecionado.fornecedor || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Validade</span>
                <span className="detail-value">
                  {produtoSelecionado.validade 
                    ? moment(produtoSelecionado.validade).format("DD/MM/YYYY")
                    : "-"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dias até Vencer</span>
                <span className="detail-value">
                  {produtoSelecionado.validade 
                    ? moment(produtoSelecionado.validade).diff(moment(), 'days')
                    : "-"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Data de Criação</span>
                <span className="detail-value">
                  {produtoSelecionado.createdAt 
                    ? moment(produtoSelecionado.createdAt.toDate()).format("DD/MM/YYYY HH:mm")
                    : "-"}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Última Atualização</span>
                <span className="detail-value">
                  {produtoSelecionado.updatedAt 
                    ? moment(produtoSelecionado.updatedAt.toDate()).format("DD/MM/YYYY HH:mm")
                    : "-"}
                </span>
              </div>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <Popconfirm
                title="Tem certeza que deseja excluir este produto?"
                onConfirm={() => {
                  excluirProduto(produtoSelecionado.id);
                  setDrawerDetalhesVisible(false);
                }}
                okText="Sim"
                cancelText="Não"
              >
                <Button danger icon={<DeleteOutlined />}>Excluir Produto</Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default ReposicaoConsultorios;
