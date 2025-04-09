import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Table, Button, Form, Modal, Input, DatePicker, Select, message, Drawer
  // eslint-disable-next-line no-unused-vars
  /* Componentes potencialmente necessários no futuro:
  Dropdown, Space, Tooltip, Badge, Popconfirm, Tag, Empty, Row, Col */
} from "antd";
import { 
  EditOutlined, DeleteOutlined, LogoutOutlined, PlusOutlined,
  FilterOutlined, ReloadOutlined, SwapOutlined, AreaChartOutlined, 
  BarsOutlined, InboxOutlined, MedicineBoxOutlined, CoffeeOutlined, 
  WarningOutlined
  // eslint-disable-next-line no-unused-vars
  /* Ícones potencialmente necessários no futuro:
  SearchOutlined, EyeOutlined, BellOutlined */
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from "chart.js";
import moment from "moment";
import Transferencia from "./Transferencia";
import "./Internacao.css";
import "./estoques-comum.css";
import "./date-picker-mobile.css";
import { stocks } from "../stocks";
import { registrarOperacao } from "../services/registroService";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

// Adicionando um log para debug e um fallback para o collectionName
console.log("Stocks importado:", stocks);
let collectionName = "produtosInternacao"; // Valor padrão como fallback
try {
  collectionName = stocks.internacao;
  console.log("Collection name definido:", collectionName);
} catch (error) {
  console.error("Erro ao acessar stocks.internacao:", error);
}

function Internacao() {
  const { currentUser, logout } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [exibirGrafico, setExibirGrafico] = useState(true);
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

  // Novo estado para o filtro visível
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

  // Função para lidar com a busca
  const handleBusca = (valor) => {
    setBusca(valor);
  };

  // Função para alternar visibilidade do filtro
  const toggleFiltro = () => {
    setFiltroVisivel(!filtroVisivel);
  };

  // Função para alternar visibilidade do gráfico
  const toggleGrafico = () => {
    setExibirGrafico(!exibirGrafico);
  };

  // Carregar produtos da coleção
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregarProdutos = useCallback(async () => {
    try {
      console.log("Carregando produtos da coleção:", collectionName);
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      // Transformar documentos em objetos com propriedades corretas
      const produtosData = querySnapshot.docs.map(doc => {
        // Certifique-se de que o id está sendo corretamente adicionado
        const dados = doc.data();
        return {
          ...dados,
          id: doc.id, // Garantir que o ID é adicionado explicitamente
          validade: dados.validade?.toDate(), // Converter Timestamp para Date se existir
          quantidade: Number(dados.quantidade || 0),
          valor: Number(dados.valor || 0)
        };
      });
      
      console.log(`Produtos carregados: ${produtosData.length}`, {
        primeiroId: produtosData.length > 0 ? produtosData[0].id : 'nenhum'
      });
      
      setProdutos(produtosData);
      verificarNotificacoes(produtosData);
      setAtualizarTabs(prev => prev + 1); // Atualizar tabs para forçar re-renderização
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      message.error("Erro ao carregar produtos: " + error.message);
    }
  }, []);

  useEffect(() => {
    if (currentUser) carregarProdutos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const verificarNotificacoes = (produtos) => {
    const baixos = produtos.filter(p => p.quantidade < 5);
    if (baixos.length > 0) {
      message.warning(`${baixos.length} produtos com quantidade crítica!`);
    }
  };

  const removerProduto = useCallback(async (id) => {
    Modal.confirm({
      title: "Confirmar exclusão?",
      content: "Tem certeza de que deseja excluir este produto?",
      onOk: async () => {
        try {
          console.log('Removendo produto:', {id, collectionName});
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const produtoData = docSnap.data();
            await deleteDoc(docRef);
            
            // Registrar a operação de remoção
            await registrarOperacao(
              currentUser.email,
              'remocao',
              produtoData.nome,
              'Internação',
              null,
              produtoData.quantidade
            );
            
            await carregarProdutos();
            message.success("Produto excluído com sucesso!");
          } else {
            message.error("Produto não encontrado para exclusão.");
          }
        } catch (error) {
          console.error('Erro ao remover produto:', error);
          message.error("Erro ao excluir produto: " + error.message);
        }
      },
    });
  }, [currentUser.email, carregarProdutos]);

  const editarProduto = useCallback((produto) => {
    console.log('Editando produto:', produto);
    
    // Verificar se o produto tem um ID válido
    if (!produto || !produto.id) {
      console.error('Produto sem ID válido:', produto);
      message.error("ID do produto não encontrado. Tente recarregar a página.");
      return;
    }
    
    setProdutoEditando(produto);
    form.setFieldsValue({
      ...produto,
      validade: produto.validade ? moment(produto.validade) : null
    });
    setModalVisible(true);
  }, [form]);

  // Adicionar esta função para abrir o modal de adicionar leva
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

  // Adicionar esta função para quando o produto for selecionado
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

  // Adicionar esta função para salvar uma nova leva
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

      const docRef = await addDoc(collection(db, collectionName), dados);
      
      // Registrar a operação de adição de leva
      await registrarOperacao(
        currentUser.email,
        'adicao_leva',
        dados.nome,
        'Internação',
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
      message.error("Erro ao adicionar leva: " + error.message);
    }
  };

  const salvarProduto = async (values) => {
    try {
      // Verificação adicional para garantir que o ID do produto existe
      if (produtoEditando && !produtoEditando.id) {
        console.error('ID do produto inválido ao salvar:', produtoEditando);
        message.error("ID do produto não encontrado");
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
          collectionName,
          produtoEditando,
          values
        });
        
        const docRef = doc(db, collectionName, produtoEditando.id);
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
            'Internação',
            null,
            dados.quantidade,
            { valorUnitario: dados.valor }
          );
          
          message.success("Produto atualizado!");
        } else {
          console.error('Documento não encontrado:', {
            collectionName, 
            id: produtoEditando.id,
            todosIds: produtos.map(p => p.id)
          });
          message.error("Produto não encontrado para atualização.");
        }
      } else {
        const docRef = await addDoc(collection(db, collectionName), { ...dados, createdAt: new Date() });
        
        // Registrar a operação de adição
        await registrarOperacao(
          currentUser.email,
          'adicao',
          dados.nome,
          'Internação',
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
      message.error("Erro ao salvar: " + error.message);
    }
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

  const aplicarFiltros = () => {
    return produtosFiltradosEOrdenados;
  };

  // Filtrar e ordenar produtos baseado na busca e filtros
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

  // Definir colunas para a tabela
  const colunas = useMemo(() => [
    { title: "Nome", dataIndex: "nome" },
    { title: "Categoria", dataIndex: "categoria" },
    { title: "Tipo", dataIndex: "tipoQuantidade" },
    { title: "Quantidade", dataIndex: "quantidade" },
    { title: "Fornecedor", dataIndex: "fornecedor" },
    { title: "Preço (R$)", dataIndex: "valor", render: val => `R$ ${Number(val).toFixed(2)}` },
    { title: "Validade", dataIndex: "validade", render: val => (val ? moment(val).format("DD/MM/YYYY") : "-") },
    {
      title: "Ações",
      render: (_, record) => (
        <div className="acoes-container">
          <Button icon={<EditOutlined />} onClick={() => editarProduto(record)} />
          <Button icon={<DeleteOutlined />} onClick={() => removerProduto(record.id)} danger />
        </div>
      )
    }
  ], [editarProduto, removerProduto]);

  // Configurações para o gráfico
  const CORES_POR_CATEGORIA = useMemo(() => ({
    "Medicamentos": "#FF6384",
    "Insumos": "#36A2EB",
    "Alimentação": "#FFCE56",
    "Higiene": "#4BC0C0",
    "Diversos": "#9966FF"
  }), []);
  
  // Dados para o gráfico de barras
  const dadosGrafico = useMemo(() => {
    const categorias = Object.keys(CORES_POR_CATEGORIA);
    const quantidadePorCategoria = categorias.map(categoria => {
      return produtos.filter(p => p.categoria === categoria).length;
    });
    
    return {
      labels: categorias,
      datasets: [
        {
          label: 'Quantidade de Produtos',
          data: quantidadePorCategoria,
          backgroundColor: Object.values(CORES_POR_CATEGORIA),
          borderColor: Object.values(CORES_POR_CATEGORIA).map(cor => cor.replace(')', ', 0.8)')),
          borderWidth: 1,
        }
      ]
    };
  }, [produtos, CORES_POR_CATEGORIA]);
  
  // Opções do gráfico
  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 10,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 14
        }
      }
    },
    scales: {
      y: {
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Renderização do componente
  return (
    <div className="estoque-container">
      <div className="header-fixo">
        <div className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="logo"><MedicineBoxOutlined /></span>
              <h1>Internação</h1>
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
            onClick={carregarProdutos}>
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
                      .reduce((total, produto) => total + produto.valor * produto.quantidade, 0)
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
                    {produtos.filter(produto => produto.quantidade < 5).length}
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
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} produtos`
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
          <div className="form-grid">
            <Form.Item name="nome" label="Nome do Produto" rules={[{ required: true, message: "Campo obrigatório!" }]}>
              <Input placeholder="Ex: Seringa 10ml" />
            </Form.Item>
            <Form.Item name="categoria" label="Categoria" rules={[{ required: true, message: "Selecione uma categoria!" }]}>
              <Select placeholder="Selecione...">
                <Select.Option value="Medicamentos">Medicamentos</Select.Option>
                <Select.Option value="Insumos">Insumos</Select.Option>
                <Select.Option value="Comida">Comida</Select.Option>
              </Select>
            </Form.Item>
            {/* Novo campo para escolher o tipo de quantidade */}
            <Form.Item name="tipoQuantidade" label="Tipo de Quantidade" rules={[{ required: true, message: "Selecione o tipo de quantidade!" }]}>
              <Select placeholder="Selecione...">
                <Select.Option value="unitario">Unitário</Select.Option>
                <Select.Option value="pacotes">Pacotes</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="quantidade" label="Quantidade em Estoque" rules={[{ required: true, message: "Campo obrigatório!" }]}>
              <Input type="number" min={0} placeholder="Ex: 100" />
            </Form.Item>
            <Form.Item name="valor" label="Preço Unitário (R$)" rules={[{ required: true, message: "Campo obrigatório!" }]}>
              <Input type="number" min={0} step={0.01} placeholder="Ex: 12.50" />
            </Form.Item>
            <Form.Item name="validade" label="Data de Validade" rules={[{ required: true, message: "Selecione uma data!" }]}>
              <DatePicker
                format="DD/MM/YYYY"
                disabledDate={current => current && current < moment().startOf("day")}
                style={{ width: '100%' }}
                placeholder="Selecione a data"
                inputReadOnly={true}
                className="date-picker-mobile"
                popupClassName="date-picker-popup-mobile"
              />
            </Form.Item>
            <Form.Item name="fornecedor" label="Fornecedor" rules={[{ required: true, message: "Informe o fornecedor!" }]}>
              <Input placeholder="Ex: Distribuidora Médica ABC" />
            </Form.Item>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
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
          </div>
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
          
          <div className="form-grid">
            <Form.Item name="quantidade" label="Quantidade da Nova Leva" rules={[{ required: true, message: "Informe a quantidade!" }]}>
              <Input type="number" min={1} placeholder="Ex: 100" />
            </Form.Item>
            
            <Form.Item name="valor" label="Preço Unitário (R$)" rules={[{ required: true, message: "Informe o preço!" }]}>
              <Input type="number" min={0} step={0.01} placeholder="Ex: 12.50" />
            </Form.Item>
            
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
            
            <Form.Item name="fornecedor" label="Fornecedor" rules={[{ required: true, message: "Informe o fornecedor!" }]}>
              <Input placeholder="Ex: Distribuidora Médica ABC" />
            </Form.Item>
          </div>
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button 
              onClick={() => {
                setModalLevaVisible(false);
                setProdutoSelecionadoLeva(null);
                formLeva.resetFields();
              }} 
              style={{ marginRight: 8 }}
            >
              Cancelar
            </Button>
            <Button type="primary" onClick={() => formLeva.submit()}>
              Adicionar Nova Leva
            </Button>
          </div>
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
          origem={collectionName}
          onFinish={() => {
            setShowTransfer(false);
            carregarProdutos();
          }}
        />
      </Drawer>
    </div>
  );
}

export default Internacao;
