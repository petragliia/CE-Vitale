import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Button, Tabs, Form, notification, Modal, Input, DatePicker, Select, Drawer } from "antd";
import { 
  EditOutlined, DeleteOutlined, LogoutOutlined, PlusOutlined, 
  ReloadOutlined, AppstoreAddOutlined, FilterOutlined, 
  SwapOutlined, BarsOutlined, AreaChartOutlined, InboxOutlined, CoffeeOutlined,
  WarningOutlined, MedicineBoxOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import moment from "moment";
import "./estoques-comum.css";
import "./date-picker-mobile.css";
import { registrarOperacao } from "../services/registroService";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ReposicaoConsultorios() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [exibirGrafico, setExibirGrafico] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [form] = Form.useForm();
  const [atualizarTabs, setAtualizarTabs] = useState(0);
  const [modalLevaVisible, setModalLevaVisible] = useState(false);
  const [formLeva] = Form.useForm();
  const [produtosSelecionaveis, setProdutosSelecionaveis] = useState([]);
  const [produtoSelecionadoLeva, setProdutoSelecionadoLeva] = useState(null);
  // Novo estado para o filtro visível
  const [filtroVisivel, setFiltroVisivel] = useState(false);
  // Estado para transferência
  const [showTransfer, setShowTransfer] = useState(false);
  
  // Estado para filtros avançados
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
  
  // Filtrar produtos baseados na busca
  const filtrarProdutos = (lista, termoBusca) => {
    if (!termoBusca) return lista;
    
    const termo = termoBusca.toLowerCase();
    return lista.filter(p => 
      p.nome.toLowerCase().includes(termo) || 
      p.fornecedor?.toLowerCase().includes(termo) || 
      (p.codigo && p.codigo.toString().toLowerCase().includes(termo))
    );
  };

  // Produtos filtrados baseados na busca
  const produtosFiltrados = useMemo(() => {
    return filtrarProdutos(produtos, busca);
  }, [produtos, busca]);

  const CORES_POR_CATEGORIA = useMemo(() => ({
    Medicamentos: "#1976D2",
    Insumos: "#4CAF50",
    Comida: "#FF9800"
  }), []);

  const handleBusca = (valor) => {
    setBusca(valor);
  };

  const carregarProdutos = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "reposicao"));
      const lista = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        validade: doc.data().validade?.toDate(),
        quantidade: Number(doc.data().quantidade),
        valor: Number(doc.data().valor)
      }));
      setProdutos(lista);
      setAtualizarTabs(prev => prev + 1);
    } catch (error) {
      notification.error({ message: "Erro ao carregar produtos", description: error.message });
    }
  }, []);

  useEffect(() => {
    if (currentUser) carregarProdutos();
  }, [currentUser, carregarProdutos]);

  const removerProduto = useCallback(async (id) => {
    Modal.confirm({
      title: "Confirmar exclusão?",
      content: "Tem certeza de que deseja excluir este produto?",
      onOk: async () => {
        try {
          console.log('Removendo produto:', {id, collectionName: "reposicao"});
          const docRef = doc(db, "reposicao", id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const produtoData = docSnap.data();
            await deleteDoc(docRef);
            
            // Registrar a operação de remoção
            await registrarOperacao(
              currentUser.email,
              'remocao',
              produtoData.nome,
              'Reposição Consultorios',
              null,
              produtoData.quantidade
            );
            
            await carregarProdutos();
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
  }, [currentUser.email, carregarProdutos]);

  const editarProduto = useCallback((produto) => {
    console.log('Editando produto:', produto);
    
    // Verificar se o produto tem um ID válido
    if (!produto || !produto.id) {
      console.error('Produto sem ID válido:', produto);
      notification.error({ 
        message: "Erro ao editar produto", 
        description: "ID do produto não encontrado. Tente recarregar a página."
      });
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
      // Verificação adicional para garantir que o ID do produto existe
      if (produtoEditando && !produtoEditando.id) {
        console.error('ID do produto inválido ao salvar:', produtoEditando);
        notification.error("ID do produto não encontrado");
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
          collectionName: "reposicao",
          produtoEditando,
          values
        });
        
        const docRef = doc(db, "reposicao", produtoEditando.id);
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
            'Reposição Consultorios',
            null,
            dados.quantidade,
            { valorUnitario: dados.valor }
          );
          
          notification.success("Produto atualizado!");
        } else {
          console.error('Documento não encontrado:', {
            collectionName: "reposicao", 
            id: produtoEditando.id,
            todosIds: produtos.map(p => p.id)
          });
          notification.error("Produto não encontrado para atualização.");
        }
      } else {
        // eslint-disable-next-line no-unused-vars
        const docRef = await addDoc(collection(db, "reposicao"), { ...dados, createdAt: new Date() });
        
        // Registrar a operação de adição
        await registrarOperacao(
          currentUser.email,
          'adicao',
          dados.nome,
          'Reposição Consultorios',
          null,
          dados.quantidade
        );
        
        notification.success("Produto adicionado!");
      }
      await carregarProdutos();
      setModalVisible(false);
      setProdutoEditando(null);
      form.resetFields();
    } catch (error) {
      notification.error("Erro ao salvar: " + error.message);
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

      const docRef = await addDoc(collection(db, "reposicao"), dados);
      
      // Registrar a operação de adição de leva
      await registrarOperacao(
        currentUser.email,
        'adicao_leva',
        dados.nome,
        'Reposição Consultorios',
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

  const tabsItems = [
    ...Object.keys(CORES_POR_CATEGORIA).map(categoria => {
      // Seção de dados filtrados por categoria
      const produtosCategoria = categoria === "Todos" 
        ? produtosFiltrados 
        : produtosFiltrados.filter(p => p.categoria === categoria);
      
      return {
        key: categoria,
        label: `${categoria} (${produtosCategoria.length})`,
        children: (
          <Table
            dataSource={produtosCategoria}
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
                    <Button 
                      icon={<EditOutlined />} 
                      onClick={() => editarProduto(record)} 
                    />
                    <Button 
                      icon={<DeleteOutlined />} 
                      onClick={() => removerProduto(record.id)} 
                      danger 
                    />
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
      label: `Itens/Produtos (${produtosFiltrados.length})`,
      children: (
        <>
          <div className="acoes-tabela-container">
            <Button 
              type="primary" 
              icon={<AppstoreAddOutlined />} 
              onClick={abrirModalAdicionarLeva}
              style={{ marginBottom: 16 }}
              className="standard-button"
            >
              Adicionar Leva
            </Button>
          </div>
          <Table
            dataSource={produtosFiltrados}
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
                    <Button 
                      icon={<EditOutlined />} 
                      onClick={() => editarProduto(record)} 
                    />
                    <Button 
                      icon={<DeleteOutlined />} 
                      onClick={() => removerProduto(record.id)} 
                      danger 
                    />
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

  // Função para alternar visibilidade do filtro
  const toggleFiltro = () => {
    setFiltroVisivel(!filtroVisivel);
  };

  // Função para alternar visibilidade do gráfico
  const toggleGrafico = () => {
    setExibirGrafico(!exibirGrafico);
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
    // Atualizar os resultados com base nos filtros
    setAtualizarTabs(prev => prev + 1);
  };

  return (
    <div className="estoque-container">
      <div className="header-fixo">
        <div className="header">
          <div className="header-content">
            <div className="header-title">
              <span className="logo"><AppstoreAddOutlined /></span>
              <h1>Reposição de Consultórios</h1>
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
                    inputReadOnly={true}
                    className="date-picker-mobile"
                  />
                </Form.Item>
                <Form.Item label=" ">
                  <DatePicker
                    placeholder="Data Final"
                    value={filtros.validadeFim ? moment(filtros.validadeFim) : null}
                    onChange={(date) => setFiltros({ ...filtros, validadeFim: date ? date.toDate() : null })}
                    style={{ width: '100%' }}
                    inputReadOnly={true}
                    className="date-picker-mobile"
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
        <Tabs key={atualizarTabs} defaultActiveKey="Medicamentos" items={tabsItems} />
        {exibirGrafico && (
          <div className="grafico-container">
            <div className="grafico-header">
              <h3>Distribuição do Estoque</h3>
            </div>
            <div className="grafico-wrapper">
              <Bar data={dadosGrafico} options={opcoesGrafico} />
            </div>
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
              />
            </Form.Item>
            
            <Form.Item name="fornecedor" label="Fornecedor" rules={[{ required: true, message: "Informe o fornecedor!" }]}>
              <Input placeholder="Ex: Distribuidora Médica ABC" />
            </Form.Item>
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
        {/* Componente de transferência será adicionado aqui */}
        <p>Funcionalidade de transferência em desenvolvimento.</p>
      </Drawer>
    </div>
  );
}

export default ReposicaoConsultorios;
