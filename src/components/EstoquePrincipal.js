import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Button, Tabs, AutoComplete, Form, notification, Modal, Input, DatePicker, Select, Dropdown } from "antd";
import { EditOutlined, DeleteOutlined, LogoutOutlined, BellOutlined, PlusOutlined, EyeOutlined, EyeInvisibleOutlined, SwapOutlined, FilterOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import moment from "moment";
import Transferencia from "./Transferencia";
import { stocks } from "../stocks";
import "./EstoquePrincipal.css";
import "./date-picker-mobile.css";
import { registrarOperacao } from "../services/registroService";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function EstoquePrincipal() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState([]);
  const [exibirGrafico, setExibirGrafico] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [form] = Form.useForm();
  const [atualizarTabs, setAtualizarTabs] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  
  // Estados para filtros avançados
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
  const collectionName = stocks.principal;

  const CORES_POR_CATEGORIA = useMemo(() => ({
    Medicamentos: "#1976D2",
    Insumos: "#4CAF50",
    Comida: "#FF9800"
  }), []);

  const [modalLevaVisible, setModalLevaVisible] = useState(false);
  const [formLeva] = Form.useForm();
  const [produtosSelecionaveis, setProdutosSelecionaveis] = useState([]);
  const [produtoSelecionadoLeva, setProdutoSelecionadoLeva] = useState(null);

  const handleBusca = (valor) => {
    setBusca(valor);
    setSugestoes(valor ? produtos.filter(p => p.nome.toLowerCase().includes(valor.toLowerCase())) : []);
  };

  const aplicarFiltros = () => {
    // Filtra os produtos com base nos múltiplos critérios
    const produtosFiltrados = produtos.filter(produto => {
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

  const verificarNotificacoes = (produtos) => {
    const baixos = produtos.filter(p => p.quantidade < 5);
    if (baixos.length > 0) {
      notification.warning({
        message: "Estoque Baixo!",
        description: `${baixos.length} produtos com quantidade crítica!`,
        icon: <BellOutlined style={{ color: "#faad14" }} />
      });
    }
  };

  const carregarProdutos = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validade: doc.data().validade?.toDate(),
        quantidade: Number(doc.data().quantidade),
        valor: Number(doc.data().valor)
      }));
      setProdutos(lista);
      verificarNotificacoes(lista);
      setAtualizarTabs(prev => prev + 1);
    } catch (error) {
      notification.error({ message: "Erro ao carregar produtos", description: error.message });
    }
  }, [collectionName]);

  useEffect(() => {
    if (currentUser) carregarProdutos();
  }, [currentUser, carregarProdutos]);

  const removerProduto = async (id) => {
    Modal.confirm({
      title: "Confirmar exclusão?",
      content: "Tem certeza de que deseja excluir este produto?",
      onOk: async () => {
        try {
          console.log('Removendo produto:', {id, collectionName});
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            await deleteDoc(docRef);
            await carregarProdutos();
            await registrarOperacao(
              currentUser.email,
              'remocao',
              produtos.find(p => p.id === id).nome,
              'Estoque Principal',
              null,
              produtos.find(p => p.id === id).quantidade,
              {
                categoria: produtos.find(p => p.id === id).categoria,
                id: id
              }
            );
            notification.success({ message: "Produto excluído com sucesso!" });
          } else {
            notification.error({ message: "Produto não encontrado para exclusão." });
          }
        } catch (error) {
          console.error('Erro ao remover produto:', error);
          notification.error({ message: "Erro ao excluir produto", description: error.message });
        }
      },
    });
  };

  const editarProduto = (produto) => {
    setProdutoEditando(produto);
    form.setFieldsValue({
      ...produto,
      validade: produto.validade ? moment(produto.validade) : null
    });
    setModalVisible(true);
  };

  const salvarProduto = async (values) => {
    try {
      console.log('Salvando produto:', {
        produtoEditando,
        values,
        collectionName
      });
      
      const dados = {
        ...values,
        validade: values.validade?.toDate(),
        quantidade: Number(values.quantidade),
        valor: Number(values.valor),
        userId: currentUser.uid,
        updatedAt: new Date()
      };

      if (produtoEditando) {
        const docRef = doc(db, collectionName, produtoEditando.id);
        console.log('Referência do documento:', docRef.path);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          await updateDoc(docRef, dados);
          await registrarOperacao(
            currentUser.email,
            'atualizacao',
            produtoEditando.nome,
            'Estoque Principal',
            null,
            produtoEditando.quantidade,
            {
              categoria: produtoEditando.categoria,
              valor: produtoEditando.valor,
              validade: produtoEditando.validade ? moment(produtoEditando.validade).format('DD/MM/YYYY') : 'N/A'
            }
          );
          notification.success({ message: "Produto atualizado!" });
        } else {
          notification.error({ message: "Produto não encontrado para atualização." });
        }
      } else {
        await addDoc(collection(db, collectionName), { ...dados, createdAt: new Date() });
        await registrarOperacao(
          currentUser.email,
          'adicao',
          values.nome,
          'Estoque Principal',
          null,
          values.quantidade,
          {
            categoria: values.categoria,
            valor: values.valor,
            validade: values.validade ? moment(values.validade).format('DD/MM/YYYY') : 'N/A'
          }
        );
        notification.success({ message: "Produto adicionado!" });
      }
      await carregarProdutos();
      setModalVisible(false);
      setProdutoEditando(null);
      form.resetFields();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      notification.error({ message: "Erro ao salvar", description: error.message });
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

  // Adicionar esta função para abrir o modal de adicionar leva
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
        notification.error({ message: "Selecione um produto para adicionar leva" });
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
        'Estoque Principal',
        null,
        dados.quantidade,
        { valorUnitario: dados.valor, id: docRef.id }
      );
      
      notification.success({ message: "Nova leva adicionada com sucesso!" });
      await carregarProdutos();
      setModalLevaVisible(false);
      formLeva.resetFields();
      setProdutoSelecionadoLeva(null);
    } catch (error) {
      notification.error({ message: "Erro ao adicionar leva", description: error.message });
    }
  };

  // Define as abas por categoria e a aba "Itens/Produtos"
  const tabsItems = [
    ...Object.keys(CORES_POR_CATEGORIA).map(categoria => {
      // Aplicar os filtros aos produtos da categoria
      let produtosFiltrados = produtos.filter(p => p.categoria === categoria);
      
      // Se a busca simples estiver ativa
      if (busca && !filtroAvancado) {
        produtosFiltrados = produtosFiltrados.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
      }
      
      // Se o filtro avançado estiver ativo
      if (filtroAvancado) {
        const todosFiltrados = aplicarFiltros();
        produtosFiltrados = todosFiltrados.filter(p => p.categoria === categoria);
      }
      
      return {
        key: categoria,
        label: `${categoria} (${produtosFiltrados.length})`,
        children: (
          <Table
            dataSource={produtosFiltrados}
            columns={[
              { title: "Nome", dataIndex: "nome" },
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
            ]}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        )
      };
    }),
    {
      key: "itens-produtos",
      label: `Itens/Produtos (${filtroAvancado ? aplicarFiltros().length : (busca ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).length : produtos.length)})`,
      children: (
        <>
          <div className="acoes-tabela-container">
            <Button 
              type="primary" 
              icon={<AppstoreAddOutlined />} 
              onClick={abrirModalAdicionarLeva}
              style={{ marginBottom: 16 }}
            >
              Adicionar Leva
            </Button>
          </div>
          <Table
            dataSource={filtroAvancado ? aplicarFiltros() : (busca ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())) : produtos)}
            columns={[
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
            ]}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        </>
      )
    }
  ];

  return (
    <div className="estoque-container">
      <div className="header-fixo">
        <div className="header">
          <h1 className="title">🐾 Estoque Principal</h1>
          <div className="header-buttons">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
              Novo Produto
            </Button>
            <Button icon={<LogoutOutlined />} onClick={logout} className="logout-btn">
              Sair
            </Button>
          </div>
        </div>
        <div className="control-buttons">
          {!showTransfer && (
            <>
              <Button onClick={() => setShowTransfer(true)}>Transferência de Itens</Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '1',
                      label: 'Estoque Principal',
                      onClick: () => navigate("/estoque-principal")
                    },
                    {
                      key: '2',
                      label: 'Estoque Vet',
                      onClick: () => navigate("/estoque-vet")
                    },
                    {
                      key: '3',
                      label: 'Internação',
                      onClick: () => navigate("/estoque-internacao")
                    },
                    {
                      key: '4',
                      label: 'Reposição de Consultorios',
                      onClick: () => navigate("/estoque-reposicao")
                    }
                  ]
                }}
              >
                <Button icon={<SwapOutlined />}>Ir para...</Button>
              </Dropdown>
            </>
          )}
          {showTransfer && (
            <Button onClick={() => setShowTransfer(false)}>Voltar ao Controle</Button>
          )}
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </div>
      {showTransfer ? (
        <Transferencia 
          sourceStock="principal" 
          onBack={() => {
            setShowTransfer(false); 
            carregarProdutos(); // Recarregar produtos ao voltar da transferência
          }}
        />
      ) : (
        <>
          <div className="controls-container">
            <div className="filter-container">
              {filtroAvancado ? (
                <div className="filtros-avancados">
                  <Form layout="vertical">
                    <div className="form-grid">
                      <Form.Item label="Nome do Produto">
                        <Input
                          placeholder="Buscar por nome"
                          value={filtros.nome}
                          onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Fornecedor">
                        <Input
                          placeholder="Buscar por fornecedor"
                          value={filtros.fornecedor}
                          onChange={(e) => setFiltros({...filtros, fornecedor: e.target.value})}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Preço Mínimo (R$)">
                        <Input
                          type="number"
                          placeholder="Preço mínimo"
                          value={filtros.precoMin}
                          onChange={(e) => setFiltros({...filtros, precoMin: e.target.value})}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Preço Máximo (R$)">
                        <Input
                          type="number"
                          placeholder="Preço máximo"
                          value={filtros.precoMax}
                          onChange={(e) => setFiltros({...filtros, precoMax: e.target.value})}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Quantidade Mínima">
                        <Input
                          type="number"
                          placeholder="Quantidade mínima"
                          value={filtros.quantidadeMin}
                          onChange={(e) => setFiltros({...filtros, quantidadeMin: e.target.value})}
                        />
                      </Form.Item>
                      
                      <Form.Item label="Quantidade Máxima">
                        <Input
                          type="number"
                          placeholder="Quantidade máxima"
                          value={filtros.quantidadeMax}
                          onChange={(e) => setFiltros({...filtros, quantidadeMax: e.target.value})}
                        />
                      </Form.Item>
                      
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
                          inputReadOnly={true}
                          className="date-picker-mobile"
                          popupClassName="date-picker-popup-mobile"
                        />
                      </Form.Item>
                    </div>
                    
                    <div className="filtro-buttons">
                      <Button type="primary" onClick={() => setAtualizarTabs(prev => prev + 1)}>
                        Aplicar Filtros
                      </Button>
                      <Button onClick={limparFiltros} style={{ marginLeft: 10 }}>
                        Limpar Filtros
                      </Button>
                      <Button 
                        onClick={() => setFiltroAvancado(false)} 
                        style={{ marginLeft: 10 }}
                        icon={<EyeInvisibleOutlined />}
                      >
                        Ocultar Filtros
                      </Button>
                    </div>
                  </Form>
                </div>
              ) : (
                <div className="search-bar-container">
                  <div className="search-with-filter">
                    <AutoComplete
                      options={sugestoes.map(p => ({
                        value: p.nome,
                        label: (
                          <div className="opcao-busca">
                            <span>{p.nome}</span>
                            <small>Categoria: {p.categoria}</small>
                            <small>Estoque: {p.quantidade}</small>
                          </div>
                        )
                      }))}
                      value={busca}
                      onChange={handleBusca}
                      placeholder="Buscar produto..."
                      className="search-bar"
                      popupClassName="dropdown-busca"
                    >
                      <Input.Search allowClear enterButton />
                    </AutoComplete>
                    <Button 
                      icon={<FilterOutlined />}
                      onClick={() => setFiltroAvancado(true)}
                      className="filter-button"
                      title="Mostrar Filtros Avançados"
                    >
                      Filtros
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="main-content">
            <Tabs key={atualizarTabs} defaultActiveKey="Medicamentos" items={tabsItems} />
            {exibirGrafico && (
              <div className="grafico-container">
                <div className="grafico-header">
                  <h3>Distribuição do Estoque</h3>
                  <Button type="primary" onClick={() => setExibirGrafico(!exibirGrafico)} icon={<EyeInvisibleOutlined />}>
                    Esconder Gráfico
                  </Button>
                </div>
                <div className="grafico-wrapper">
                  <Bar data={dadosGrafico} options={opcoesGrafico} />
                </div>
              </div>
            )}
            {!exibirGrafico && (
              <div className="mostrar-grafico">
                <Button type="primary" onClick={() => setExibirGrafico(!exibirGrafico)} icon={<EyeOutlined />}>
                  Mostrar Gráfico
                </Button>
              </div>
            )}
          </div>
          <Modal
            title={produtoEditando ? "Editar Produto" : "Novo Produto"}
            open={modalVisible}
            onCancel={() => {
              setModalVisible(false);
              setProdutoEditando(null);
              form.resetFields();
            }}
            onOk={() => form.submit()}
            width={600}
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
            onOk={() => formLeva.submit()}
            width={600}
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
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
}

export default EstoquePrincipal;
