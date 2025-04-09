// components/EstoqueVet.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { 
  Table, Button, Form, Modal, Input, DatePicker, Select, message, Drawer, Row, Col
  // eslint-disable-next-line no-unused-vars
  /* Componentes que podem ser necessários no futuro:
  Dropdown, Space, Tooltip, Badge, Popconfirm, Tag, Empty */
} from "antd";
import { 
  PlusOutlined, FilterOutlined, ReloadOutlined, 
  SwapOutlined, EditOutlined, DeleteOutlined, 
  AreaChartOutlined, BarsOutlined, LogoutOutlined,
  InboxOutlined, MedicineBoxOutlined, CoffeeOutlined, 
  WarningOutlined
  // eslint-disable-next-line no-unused-vars
  /* Ícones que podem ser necessários no futuro:
  SearchOutlined, EyeOutlined */
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from "chart.js";
import moment from "moment";
import Transferencia from "./Transferencia";
import { stocks } from "../stocks";
import "./EstoqueVet.css";
import "./estoques-comum.css";
import "./date-picker-mobile.css";
import { registrarOperacao } from "../services/registroService";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

function EstoqueVet() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [form] = Form.useForm();
  // eslint-disable-next-line no-unused-vars
  const [atualizarTabs, setAtualizarTabs] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [modalLevaVisible, setModalLevaVisible] = useState(false);
  const [formLeva] = Form.useForm();
  const [produtosSelecionaveis, setProdutosSelecionaveis] = useState([]);
  const [produtoSelecionadoLeva, setProdutoSelecionadoLeva] = useState(null);
  // Estado produtosFiltrados removido por não ser utilizado (usamos produtosFiltradosEOrdenados com useMemo)
  
  // Novos estados para a interface moderna
  const [busca, setBusca] = useState("");
  const [exibirGrafico, setExibirGrafico] = useState(true);
  const [filtroVisivel, setFiltroVisivel] = useState(false);

  // Estados para filtros avançados
  // eslint-disable-next-line no-unused-vars
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

  // eslint-disable-next-line no-unused-vars
  const CORES_POR_CATEGORIA = useMemo(() => ({
    Medicamentos: "#1976D2",
    Insumos: "#4CAF50",
    Comida: "#FF9800"
  }), []);

  const aplicarFiltros = () => {
    // Filtra os produtos com base nos múltiplos critérios
    const produtosFiltradosResult = produtos.filter(produto => {
      // Filtro por nome
      if (filtros.nome && !produto.nome.toLowerCase().includes(filtros.nome.toLowerCase())) {
        return false;
      }
      
      // Filtro por fornecedor
      if (filtros.fornecedor && (!produto.fornecedor || !produto.fornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase()))) {
        return false;
      }
      
      // Filtro por preço mínimo
      if (filtros.precoMin !== "" && Number(produto.valor) < Number(filtros.precoMin)) {
        return false;
      }
      
      // Filtro por preço máximo
      if (filtros.precoMax !== "" && Number(produto.valor) > Number(filtros.precoMax)) {
        return false;
      }
      
      // Filtro por quantidade mínima
      if (filtros.quantidadeMin !== "" && Number(produto.quantidade) < Number(filtros.quantidadeMin)) {
        return false;
      }
      
      // Filtro por quantidade máxima
      if (filtros.quantidadeMax !== "" && Number(produto.quantidade) > Number(filtros.quantidadeMax)) {
        return false;
      }
      
      // Filtro por período de validade
      if (filtros.validadeInicio && produto.validade && moment(produto.validade).isBefore(filtros.validadeInicio, 'day')) {
        return false;
      }
      
      if (filtros.validadeFim && produto.validade && moment(produto.validade).isAfter(filtros.validadeFim, 'day')) {
        return false;
      }
      
      return true;
    });
    
    // Ordenação por validade
    if (filtros.validadeOrdem) {
      produtosFiltradosResult.sort((a, b) => {
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        
        if (filtros.validadeOrdem === 'asc') {
          return moment(a.validade).diff(moment(b.validade));
        } else {
          return moment(b.validade).diff(moment(a.validade));
        }
      });
    }
    
    setFiltroVisivel(false);
  };

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
  };

  // Estado para armazenar os IDs dos produtos fantasmas (que aparecem na UI mas não no banco)
  const [produtosFantasmasIds, setProdutosFantasmasIds] = useState(() => {
    // Recuperar lista de produtos fantasmas do localStorage
    try {
      const savedIds = localStorage.getItem('produtosFantasmasVet');
      return savedIds ? JSON.parse(savedIds) : [];
    } catch (e) {
      console.error('Erro ao carregar produtos fantasmas do localStorage:', e);
      return [];
    }
  });

  // Salvar produtos fantasmas no localStorage quando a lista mudar
  useEffect(() => {
    try {
      localStorage.setItem('produtosFantasmasVet', JSON.stringify(produtosFantasmasIds));
    } catch (e) {
      console.error('Erro ao salvar produtos fantasmas no localStorage:', e);
    }
  }, [produtosFantasmasIds]);

  const carregarProdutos = useCallback(async () => {
    try {
      console.log('Carregando produtos da coleção:', stocks.vet);
      console.log('Produtos fantasmas a serem filtrados:', produtosFantasmasIds);
      
      const querySnapshot = await getDocs(collection(db, stocks.vet));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validade: doc.data().validade?.toDate(),
        quantidade: Number(doc.data().quantidade),
        valor: Number(doc.data().valor)
      }));
      
      // Filtrar produtos fantasmas da lista
      const listaFiltrada = lista.filter(produto => !produtosFantasmasIds.includes(produto.id));
      
      if (lista.length !== listaFiltrada.length) {
        console.log(`Filtrados ${lista.length - listaFiltrada.length} produtos fantasmas da lista`);
      }
      
      console.log(`Carregados ${listaFiltrada.length} produtos do estoque vet`);
      setProdutos(listaFiltrada);
      setAtualizarTabs(prev => prev + 1);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      message.error("Erro ao carregar produtos: " + (error.message || error));
    } finally {
      setCarregando(false);
    }
  }, [produtosFantasmasIds]); // Adicionar produtosFantasmasIds como dependência

  // Função para remover produtos fantasmas da interface
  const removerProdutoFantasma = useCallback((id) => {
    console.log('Removendo produto fantasma da interface:', id);
    
    // Remover do estado atual
    setProdutos(produtos => produtos.filter(p => p.id !== id));
    
    // Adicionar à lista negra para evitar que reapareça
    setProdutosFantasmasIds(ids => {
      if (!ids.includes(id)) {
        return [...ids, id];
      }
      return ids;
    });
    
    message.success('Produto removido da interface e adicionado à lista negra');
  }, []);

  const removerProduto = useCallback(async (id) => {
    Modal.confirm({
      title: "Confirmar exclusão?",
      content: "Tem certeza de que deseja excluir este produto?",
      onOk: async () => {
        try {
          console.log('Tentando remover produto com ID:', id);
          console.log('Collection name:', stocks.vet);
          
          // Verificar se o ID é válido
          if (!id) {
            console.error('ID inválido para exclusão:', id);
            message.error('ID de produto inválido para exclusão');
            return;
          }
          
          const docRef = doc(db, stocks.vet, id);
          console.log('Referência do documento:', docRef.path);
          
          // Verificar se o documento existe
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const produtoData = docSnap.data();
            console.log('Produto encontrado para exclusão:', produtoData);
            
            // Executar a exclusão
            await deleteDoc(docRef);
            
            // Registrar a operação de remoção
            await registrarOperacao(
              currentUser.email,
              'remocao',
              produtoData.nome,
              'Estoque Vet',
              null,
              produtoData.quantidade
            );
            
            await carregarProdutos();
            message.success(`Produto "${produtoData.nome}" excluído com sucesso!`);
          } else {
            console.error(`Documento com ID ${id} não encontrado na coleção ${stocks.vet}`);
            
            // Verificar se o produto está na interface mas não no banco
            const produtoInterface = produtos.find(p => p.id === id);
            if (produtoInterface) {
              console.log('Produto existe na interface mas não no banco:', produtoInterface);
              // Perguntar ao usuário se deseja remover da interface
              Modal.confirm({
                title: 'Produto não existe no banco de dados',
                content: `O produto "${produtoInterface.nome}" aparece na interface mas não existe no banco de dados. Deseja removê-lo da interface?`,
                onOk: () => {
                  // Remover da interface
                  removerProdutoFantasma(id);
                },
                okText: 'Sim, remover da interface',
                cancelText: 'Não'
              });
            } else {
              // Tentar recarregar os produtos antes de mostrar o erro
              await carregarProdutos();
              message.error(`Produto não encontrado para exclusão. O produto pode já ter sido excluído ou o ID "${id}" não existe.`);
            }
          }
        } catch (error) {
          console.error('Erro ao remover produto:', error);
          message.error(`Erro ao excluir produto: ${error.message ? String(error.message) : 'Erro desconhecido'}`);
          
          // Tentar recarregar os produtos em caso de erro
          try {
            await carregarProdutos();
          } catch (loadError) {
            console.error('Erro ao recarregar produtos após falha na exclusão:', loadError);
          }
        }
      },
    });
  }, [currentUser.email, carregarProdutos, produtos, removerProdutoFantasma]);

  const editarProduto = useCallback((produto) => {
    console.log('Editando produto:', produto);
    
    // Verificar se o produto tem um ID válido
    if (!produto || !produto.id) {
      console.error('Produto sem ID válido:', produto);
      message.error("Erro ao editar produto: ID do produto não encontrado. Tente recarregar a página.");
      return;
    }
    
    setProdutoEditando(produto);
    form.setFieldsValue({
      ...produto,
      validade: produto.validade ? moment(produto.validade) : null
    });
    setModalVisible(true);
  }, [form]);

  const salvarProduto = async (values) => {
    try {
      console.log('Salvando produto:', {
        produtoEditando,
        values,
        collectionName: stocks.vet
      });
      
      // Verificação adicional para garantir que o ID do produto existe
      if (produtoEditando && !produtoEditando.id) {
        console.error('ID do produto inválido ao salvar:', produtoEditando);
        message.error("Erro ao atualizar produto: ID do produto não encontrado");
        return;
      }
      
      const dados = {
        ...values,
        validade: values.validade?.toDate(),
        quantidade: Number(values.quantidade),
        valor: Number(values.valor),
        userId: currentUser.uid,
        updatedAt: new Date()
      };

      if (produtoEditando) {
        console.log('Tentando atualizar produto:', {
          produtoId: produtoEditando.id,
          collectionName: stocks.vet,
          produtoEditando
        });
        
        const docRef = doc(db, stocks.vet, produtoEditando.id);
        console.log('Referência do documento:', docRef.path);
        const docSnap = await getDoc(docRef);
        console.log('Documento existe?', docSnap.exists(), 'ID do documento:', produtoEditando.id);

        if (docSnap.exists()) {
          await updateDoc(docRef, dados);
          
          // Registrar a operação de atualização
          await registrarOperacao(
            currentUser.email,
            'atualizacao',
            dados.nome,
            'Estoque Vet',
            null,
            dados.quantidade,
            { valorUnitario: dados.valor }
          );
          
          message.success("Produto atualizado!");
        } else {
          console.error('Documento não encontrado:', {
            collectionName: stocks.vet, 
            id: produtoEditando.id,
            todosIds: produtos.map(p => p.id)
          });
          message.error("Produto não encontrado para atualização.");
        }
      } else {
        const docRef = await addDoc(collection(db, stocks.vet), { ...dados, createdAt: new Date() });
        
        // Registrar a operação de adição
        await registrarOperacao(
          currentUser.email,
          'adicao',
          dados.nome,
          'Estoque Vet',
          null,
          dados.quantidade,
          { valorUnitario: dados.valor, id: docRef.id }
        );
        
        message.success("Produto adicionado!");
      }
      await carregarProdutos();
      setModalVisible(false);
      setProdutoEditando(null);
      form.resetFields();
    } catch (error) {
      message.error("Erro ao salvar");
    }
  };

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
          borderWidth: 2,
          borderRadius: 4,
          barThickness: 50
        }]
      },
      opcoesGrafico: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} unidades` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0, color: "#666" }, grid: { color: "#f0f0f0" } },
          x: { ticks: { color: "#444", font: { weight: "bold" } }, grid: { display: false } }
        }
      }
    };
  }, [produtos, CORES_POR_CATEGORIA]);

  // eslint-disable-next-line no-unused-vars
  const abrirModalAdicionarLeva = () => {
    // Preparar a lista de produtos existentes para seleção
    const produtosUnicos = Array.from(new Map(produtos.map(p => [p.nome, p])).values());
    setProdutosSelecionaveis(produtosUnicos.map(p => ({
      label: `${p.nome} (${p.categoria})`,
      value: p.id,
      produto: p
    })));
    setModalLevaVisible(true);
  };

  const handleSelecionarProdutoLeva = (produtoId) => {
    const produtoSelecionado = produtosSelecionaveis.find(p => p.value === produtoId);
    if (produtoSelecionado) {
      setProdutoSelecionadoLeva(produtoSelecionado.produto);
      // Preencher alguns campos do formulário com dados do produto
      formLeva.setFieldsValue({
        nome: produtoSelecionado.produto.nome,
        categoria: produtoSelecionado.produto.categoria,
        tipoQuantidade: produtoSelecionado.produto.tipoQuantidade,
        fornecedor: produtoSelecionado.produto.fornecedor,
        valor: produtoSelecionado.produto.valor
      });
    }
  };

  const salvarNovaLeva = async (values) => {
    try {
      if (!produtoSelecionadoLeva) {
        message.error("Selecione um produto para adicionar leva");
        return;
      }

      const dados = {
        nome: produtoSelecionadoLeva.nome,
        categoria: produtoSelecionadoLeva.categoria,
        tipoQuantidade: produtoSelecionadoLeva.tipoQuantidade,
        fornecedor: values.fornecedor,
        valor: Number(values.valor),
        quantidade: Number(values.quantidade),
        validade: values.validade?.toDate(),
        userId: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, stocks.vet), dados);
      
      // Registrar a operação de adição de leva
      await registrarOperacao(
        currentUser.email,
        'adicao_leva',
        dados.nome,
        'Estoque Vet',
        null,
        dados.quantidade,
        { valorUnitario: dados.valor, id: docRef.id }
      );
      
      message.success("Nova leva adicionada com sucesso!");
      await carregarProdutos();
      setModalLevaVisible(false);
      formLeva.resetFields();
      setProdutoSelecionadoLeva(null);
    } catch (error) {
      message.error("Erro ao adicionar leva");
    }
  };

  const handleBusca = (valor) => {
    setBusca(valor);
  };

  const toggleFiltro = () => {
    setFiltroVisivel(!filtroVisivel);
  };

  const toggleGrafico = () => {
    setExibirGrafico(!exibirGrafico);
  };

  // Adicionar hook para detectar tamanho da tela
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // Detectar mudanças no tamanho da tela
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const produtosFiltradosEOrdenados = useMemo(() => {
    const produtosFiltrados = produtos.filter(produto => {
      if (busca && !produto.nome.toLowerCase().includes(busca.toLowerCase())) {
        return false;
      }
      
      if (filtros.nome && !produto.nome.toLowerCase().includes(filtros.nome.toLowerCase())) {
        return false;
      }
      
      if (filtros.fornecedor && (!produto.fornecedor || !produto.fornecedor.toLowerCase().includes(filtros.fornecedor.toLowerCase()))) {
        return false;
      }
      
      if (filtros.precoMin !== "" && Number(produto.valor) < Number(filtros.precoMin)) {
        return false;
      }
      
      if (filtros.precoMax !== "" && Number(produto.valor) > Number(filtros.precoMax)) {
        return false;
      }
      
      if (filtros.quantidadeMin !== "" && Number(produto.quantidade) < Number(filtros.quantidadeMin)) {
        return false;
      }
      
      if (filtros.quantidadeMax !== "" && Number(produto.quantidade) > Number(filtros.quantidadeMax)) {
        return false;
      }
      
      if (filtros.validadeInicio && produto.validade && moment(produto.validade).isBefore(filtros.validadeInicio, 'day')) {
        return false;
      }
      
      if (filtros.validadeFim && produto.validade && moment(produto.validade).isAfter(filtros.validadeFim, 'day')) {
        return false;
      }
      
      return true;
    });
    
    if (filtros.validadeOrdem) {
      produtosFiltrados.sort((a, b) => {
        if (!a.validade) return 1;
        if (!b.validade) return -1;
        
        if (filtros.validadeOrdem === 'asc') {
          return moment(a.validade).diff(moment(b.validade));
        } else {
          return moment(b.validade).diff(moment(a.validade));
        }
      });
    }
    
    return produtosFiltrados;
  }, [produtos, busca, filtros]);

  const colunas = useMemo(() => {
    // Colunas base que serão exibidas em todos os tamanhos de tela
    const baseColumns = [
      { 
        title: "Nome", 
        dataIndex: "nome",
        ellipsis: screenWidth < 768, // Truncar texto em dispositivos móveis
        sorter: (a, b) => a.nome.localeCompare(b.nome)
      },
      { 
        title: "Quantidade", 
        dataIndex: "quantidade",
        align: 'center',
        render: (quantidade, record) => (
          <span style={{ 
            color: Number(quantidade) <= 5 ? 'red' : 'inherit',
            fontWeight: Number(quantidade) <= 5 ? 'bold' : 'normal'
          }}>
            {quantidade} {record.tipoQuantidade}
          </span>
        )
      },
    ];

    // Colunas para telas médias (tablets)
    const mediumScreenColumns = [
      { 
        title: "Categoria", 
        dataIndex: "categoria",
        ellipsis: screenWidth < 1200,
        filters: [...new Set(produtos.map(p => p.categoria))].map(cat => ({
          text: cat,
          value: cat
        })),
        onFilter: (value, record) => record.categoria === value
      },
      { 
        title: "Validade", 
        dataIndex: "validade", 
        render: val => (val ? moment(val).format("DD/MM/YYYY") : "-"),
        sorter: (a, b) => {
          if (!a.validade) return 1;
          if (!b.validade) return -1;
          return moment(a.validade).diff(moment(b.validade));
        }
      },
    ];

    // Colunas para telas grandes (desktop)
    const largeScreenColumns = [
      { title: "Tipo", dataIndex: "tipoQuantidade" },
      { 
        title: "Fornecedor", 
        dataIndex: "fornecedor",
        ellipsis: true
      },
      { 
        title: "Preço (R$)", 
        dataIndex: "valor", 
        render: val => `R$ ${Number(val).toFixed(2)}`,
        sorter: (a, b) => a.valor - b.valor
      },
    ];

    // Coluna de ações sempre presente
    const actionsColumn = {
      title: "Ações",
      width: screenWidth < 576 ? 80 : 120,
      render: (_, record) => (
        <div className="acoes-container">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => editarProduto(record)}
            size={screenWidth < 576 ? "small" : "middle"} 
          />
          <Button 
            icon={<DeleteOutlined />} 
            onClick={() => removerProduto(record.id)} 
            danger
            size={screenWidth < 576 ? "small" : "middle"}
          />
        </div>
      )
    };

    // Construir conjunto de colunas baseado no tamanho da tela
    let columns = [...baseColumns];
    
    if (screenWidth >= 768) {
      columns = [...columns, ...mediumScreenColumns];
    }
    
    if (screenWidth >= 992) {
      columns = [...columns, ...largeScreenColumns];
    }
    
    columns.push(actionsColumn);
    
    return columns;
  }, [screenWidth, produtos, editarProduto, removerProduto]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      message.error(typeof error.message === 'string' ? `Erro ao fazer logout: ${error.message}` : "Erro ao fazer logout");
    }
  };

  useEffect(() => {
    if (currentUser) carregarProdutos();
  }, [currentUser, carregarProdutos]);

  return (
    <div className="estoque-container">
      <div className="header-fixo">
        <div className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="logo"><MedicineBoxOutlined /></span>
              <h1>Estoque Veterinário</h1>
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
                onClick={handleLogout}
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
            onClick={() => setModalVisible(true)}>
            Adicionar Produto
          </Button>
          <Button 
            icon={<SwapOutlined />} 
            onClick={() => setShowTransfer(true)}>
            Transferência
          </Button>
          <Button 
            icon={<FilterOutlined />} 
            onClick={toggleFiltro}>
            {filtroVisivel ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Button 
            icon={exibirGrafico ? <BarsOutlined /> : <AreaChartOutlined />} 
            onClick={toggleGrafico}>
            {exibirGrafico ? 'Ocultar Gráfico' : 'Mostrar Gráfico'}
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={() => {
              setCarregando(true);
              carregarProdutos();
            }}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className="control-bar">
        <div className="search-area">
          <div className="search-container">
            <Input.Search
              placeholder="Buscar por nome, código, fornecedor..."
              value={busca}
              onChange={(e) => handleBusca(e.target.value)}
              onSearch={handleBusca}
              style={{ width: '100%' }}
              size="large"
            />
          </div>
        </div>
      </div>

      <div className="main-content">
        {filtroVisivel && (
          <div className="filters-panel">
            <h3>Filtros Avançados</h3>
            <div className="filters-grid">
              <Form layout="vertical">
                <Form.Item label="Nome do Produto">
                  <Input
                    placeholder="Nome"
                    value={filtros.nome}
                    onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Fornecedor">
                  <Input
                    placeholder="Fornecedor"
                    value={filtros.fornecedor}
                    onChange={(e) => setFiltros({ ...filtros, fornecedor: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Preço Mínimo">
                  <Input
                    type="number"
                    placeholder="Preço Mínimo"
                    value={filtros.precoMin}
                    onChange={(e) => setFiltros({ ...filtros, precoMin: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Preço Máximo">
                  <Input
                    type="number"
                    placeholder="Preço Máximo"
                    value={filtros.precoMax}
                    onChange={(e) => setFiltros({ ...filtros, precoMax: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Quantidade Mínima">
                  <Input
                    type="number"
                    placeholder="Quantidade Mínima"
                    value={filtros.quantidadeMin}
                    onChange={(e) => setFiltros({ ...filtros, quantidadeMin: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Quantidade Máxima">
                  <Input
                    type="number"
                    placeholder="Quantidade Máxima"
                    value={filtros.quantidadeMax}
                    onChange={(e) => setFiltros({ ...filtros, quantidadeMax: e.target.value })}
                  />
                </Form.Item>
                <Form.Item label="Ordenar Validade">
                  <Select
                    placeholder="Ordenar por"
                    value={filtros.validadeOrdem}
                    onChange={(value) => setFiltros({ ...filtros, validadeOrdem: value })}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="asc">Mais Próximas</Select.Option>
                    <Select.Option value="desc">Mais Distantes</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Validade Entre">
                  <DatePicker
                    placeholder="Data Inicial"
                    value={filtros.validadeInicio ? moment(filtros.validadeInicio) : null}
                    onChange={(date) => setFiltros({ ...filtros, validadeInicio: date ? date.toDate() : null })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label=" ">
                  <DatePicker
                    placeholder="Data Final"
                    value={filtros.validadeFim ? moment(filtros.validadeFim) : null}
                    onChange={(date) => setFiltros({ ...filtros, validadeFim: date ? date.toDate() : null })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Form>
            </div>
            <div className="filters-actions">
              <Button type="primary" onClick={aplicarFiltros}>
                Aplicar Filtros
              </Button>
              <Button onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        )}

        {exibirGrafico && (
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Total de Produtos</h3>
                  <p className="card-value">{produtos.length}</p>
                </div>
                <div className="card-icon blue">
                  <InboxOutlined />
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Valor Total do Estoque</h3>
                  <p className="card-value">
                    {produtos
                      .reduce((total, produto) => total + produto.preco * produto.quantidade, 0)
                      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="card-icon green">
                  <CoffeeOutlined />
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Produtos com Baixo Estoque</h3>
                  <p className="card-value">
                    {produtos.filter(produto => produto.quantidade < produto.estoqueMinimo).length}
                  </p>
                </div>
                <div className="card-icon orange">
                  <WarningOutlined />
                </div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Produtos a Vencer (30 dias)</h3>
                  <p className="card-value">
                    {produtos.filter(produto => {
                      if (!produto.validade) return false;
                      const validade = produto.validade.toDate ? produto.validade.toDate() : new Date(produto.validade);
                      const hoje = new Date();
                      const dias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));
                      return dias >= 0 && dias <= 30;
                    }).length}
                  </p>
                </div>
                <div className="card-icon red">
                  <MedicineBoxOutlined />
                </div>
              </div>
            </div>
          </div>
        )}

        {exibirGrafico && (
          <div className="chart-container">
            <div className="chart-header">
              <h3 className="chart-title">Distribuição de Produtos por Categoria</h3>
              <div className="chart-legend">
                {Object.entries(CORES_POR_CATEGORIA).map(([categoria, cor]) => (
                  <div key={categoria} className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: cor }} />
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

        <div className="table-container">
          <div className="table-header">
            <h3 className="table-title">Lista de Produtos</h3>
          </div>
          <Table 
            dataSource={produtosFiltradosEOrdenados} 
            columns={colunas} 
            rowKey="id" 
            loading={carregando}
            pagination={{ 
              pageSize: screenWidth < 768 ? 8 : 10,
              showSizeChanger: screenWidth >= 768,
              showQuickJumper: screenWidth >= 992,
              size: screenWidth < 768 ? "small" : "default"
            }}
            size={screenWidth < 768 ? "small" : "middle"}
            scroll={{ x: 'max-content' }}
            summary={pageData => {
              let totalQuantidade = 0;
              let totalValor = 0;

              pageData.forEach(({ quantidade, valor }) => {
                totalQuantidade += Number(quantidade);
                totalValor += Number(valor) * Number(quantidade);
              });

              return (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={screenWidth < 768 ? 1 : 2}>
                      <strong>Total</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>{totalQuantidade}</strong>
                    </Table.Summary.Cell>
                    {screenWidth >= 992 && (
                      <Table.Summary.Cell index={2} colSpan={screenWidth >= 1200 ? 3 : 2}>
                        <strong>Valor Total: R$ {totalValor.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    )}
                  </Table.Summary.Row>
                </>
              );
            }}
          />
        </div>
      </div>

      {/* Manter os modais existentes */}
      <Modal
        title={produtoEditando ? "Editar Produto" : "Adicionar Produto"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setProdutoEditando(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} onFinish={salvarProduto} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="nome" label="Nome do Produto" rules={[{ required: true, message: "Campo obrigatório!" }]}>
                <Input placeholder="Ex: Seringa 10ml" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: "Selecione uma categoria!" }]}>
                <Select placeholder="Selecione...">
                  <Select.Option value="Medicamentos">Medicamentos</Select.Option>
                  <Select.Option value="Insumos">Insumos</Select.Option>
                  <Select.Option value="Comida">Comida</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="tipoQuantidade" label="Tipo de Quantidade" rules={[{ required: true, message: "Selecione o tipo de quantidade!" }]}>
                <Select placeholder="Selecione...">
                  <Select.Option value="unitario">Unitário</Select.Option>
                  <Select.Option value="pacotes">Pacotes</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="quantidade" label="Quantidade em Estoque" rules={[{ required: true, message: "Campo obrigatório!" }]}>
                <Input type="number" min={0} placeholder="Ex: 100" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="valor" label="Preço Unitário (R$)" rules={[{ required: true, message: "Campo obrigatório!" }]}>
                <Input type="number" min={0} step={0.01} placeholder="Ex: 12.50" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="validade" label="Data de Validade" rules={[{ required: true, message: "Selecione uma data!" }]}>
                <DatePicker
                  format="DD/MM/YYYY"
                  disabledDate={current => current && current < moment().startOf("day")}
                  style={{ width: "100%" }}
                  placeholder="Selecione a data"
                  inputReadOnly={true}
                  className="date-picker-mobile"
                  popupClassName="date-picker-popup-mobile"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="fornecedor" label="Fornecedor" rules={[{ required: true, message: "Informe o fornecedor!" }]}>
                <Input placeholder="Ex: Distribuidora Médica ABC" />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right', marginTop: 16 }}>
              <Button 
                onClick={() => {
                  setModalVisible(false);
                  setProdutoEditando(null);
                  form.resetFields();
                }} 
                style={{ marginRight: 8 }}
              >
                Cancelar
              </Button>
              <Button type="primary" onClick={() => form.submit()}>
                {produtoEditando ? "Atualizar" : "Adicionar"} Produto
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Adicionar Nova Leva"
        open={modalLevaVisible}
        onCancel={() => {
          setModalLevaVisible(false);
          setProdutoSelecionadoLeva(null);
          formLeva.resetFields();
        }}
        footer={null}
      >
        <Form form={formLeva} onFinish={salvarNovaLeva} layout="vertical">
          <Form.Item 
            name="produtoId" 
            label="Selecione o Produto" 
            rules={[{ required: true, message: "Selecione um produto!" }]}
          >
            <Select 
              placeholder="Selecione um produto existente" 
              options={produtosSelecionaveis}
              onChange={handleSelecionarProdutoLeva}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          
          {produtoSelecionadoLeva && (
            <div className="info-produto-selecionado">
              <p><strong>Produto:</strong> {produtoSelecionadoLeva.nome}</p>
              <p><strong>Categoria:</strong> {produtoSelecionadoLeva.categoria}</p>
              <p><strong>Tipo:</strong> {produtoSelecionadoLeva.tipoQuantidade}</p>
            </div>
          )}
          
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="quantidade" label="Quantidade da Nova Leva" rules={[{ required: true, message: "Informe a quantidade!" }]}>
                <Input type="number" min={1} placeholder="Ex: 100" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="valor" label="Preço Unitário (R$)" rules={[{ required: true, message: "Informe o preço!" }]}>
                <Input type="number" min={0} step={0.01} placeholder="Ex: 12.50" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="validade" label="Data de Validade" rules={[{ required: true, message: "Selecione uma data!" }]}>
                <DatePicker
                  format="DD/MM/YYYY"
                  disabledDate={current => current && current < moment().startOf("day")}
                  style={{ width: "100%" }}
                  placeholder="Selecione a data"
                  inputReadOnly={true}
                  className="date-picker-mobile"
                  popupClassName="date-picker-popup-mobile"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Item name="fornecedor" label="Fornecedor" rules={[{ required: true, message: "Informe o fornecedor!" }]}>
                <Input placeholder="Ex: Distribuidora Médica ABC" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        title="Transferência de Produtos"
        placement="right"
        onClose={() => setShowTransfer(false)}
        open={showTransfer}
        width={600}
      >
        <Transferencia
          origem={stocks.vet}
          onFinish={() => {
            setShowTransfer(false);
            carregarProdutos();
          }}
        />
      </Drawer>
    </div>
  );
}

export default EstoqueVet;
