
import { useState, useEffect, useCallback, useMemo } from "react";
import { Table, Button, Tabs, AutoComplete, Form, notification, Modal, Input, DatePicker, Select, Dropdown, Menu } from "antd";
import { EditOutlined, DeleteOutlined, LogoutOutlined, BellOutlined, PlusOutlined, EyeOutlined, EyeInvisibleOutlined, SwapOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import moment from "moment";
import Transferencia from "./Transferencia";
import { stocks } from "../stocks";
import "./EstoquePrincipal.css";

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

  // Coleção referente ao estoque principal
  const collectionName = stocks.principal;

  const CORES_POR_CATEGORIA = useMemo(() => ({
    Medicamentos: "#1976D2",
    Insumos: "#4CAF50",
    Comida: "#FF9800"
  }), []);

  const handleBusca = (valor) => {
    setBusca(valor);
    setSugestoes(valor ? produtos.filter(p => p.nome.toLowerCase().includes(valor.toLowerCase())) : []);
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
          await deleteDoc(doc(db, collectionName, id));
          await carregarProdutos();
          notification.success({ message: "Produto excluído com sucesso!" });
        } catch (error) {
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
      const dados = {
        ...values,
        validade: values.validade?.toDate(),
        quantidade: Number(values.quantidade),
        valor: Number(values.valor),
        userId: currentUser.uid,
        updatedAt: new Date()
      };

      if (produtoEditando) {
        await updateDoc(doc(db, collectionName, produtoEditando.id), dados);
        notification.success({ message: "Produto atualizado!" });
      } else {
        await addDoc(collection(db, collectionName), { ...dados, createdAt: new Date() });
        notification.success({ message: "Produto adicionado!" });
      }
      await carregarProdutos();
      setModalVisible(false);
      setProdutoEditando(null);
      form.resetFields();
    } catch (error) {
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

  // Define as abas por categoria e a aba "Itens/Produtos"
  const tabsItems = [
    ...Object.keys(CORES_POR_CATEGORIA).map(categoria => {
      const produtosFiltrados = produtos.filter(p =>
        p.categoria === categoria && p.nome.toLowerCase().includes(busca.toLowerCase())
      );
      return {
        key: categoria,
        label: `${categoria} (${produtosFiltrados.length})`,
        children: (
          <Table
            dataSource={produtosFiltrados}
            columns={[
              { title: "Nome", dataIndex: "nome" },
              { title: "Quantidade", dataIndex: "quantidade" },
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
      label: `Itens/Produtos (${produtos.length})`,
      children: (
        <Table
          dataSource={produtos}
          columns={[
            { title: "Nome", dataIndex: "nome" },
            { title: "Categoria", dataIndex: "categoria" },
            { title: "Tipo", dataIndex: "tipoQuantidade" },
            { title: "Quantidade", dataIndex: "quantidade" },
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
                overlay={
                  <Menu>
                    <Menu.Item key="1" onClick={() => navigate("/estoque-principal")}>
                      Estoque Principal
                    </Menu.Item>
                    <Menu.Item key="2" onClick={() => navigate("/estoque-vet")}>
                      Estoque Vet
                    </Menu.Item>
                    <Menu.Item key="3" onClick={() => navigate("/estoque-internacao")}>
                      Internação
                    </Menu.Item>
                    <Menu.Item key="4" onClick={() => navigate("/estoque-reposicao")}>
                      Reposição de Consultorios
                    </Menu.Item>
                  </Menu>
                }
                placement="bottomLeft"
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
        <Transferencia sourceStock="principal" onBack={() => setShowTransfer(false)} />
      ) : (
        <>
          <div className="controls-container">
            <div className="search-bar-container">
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
                dropdownClassName="dropdown-busca"
                optionLabelProp="value"
              >
                <Input.Search allowClear enterButton />
              </AutoComplete>
            </div>
            <div className="grafico-toggle-container">
              <Button type="primary" onClick={() => setExibirGrafico(!exibirGrafico)} icon={exibirGrafico ? <EyeInvisibleOutlined /> : <EyeOutlined />}>
                {exibirGrafico ? "Esconder Gráfico" : "Mostrar Gráfico"}
              </Button>
            </div>
          </div>
          <div className="main-content">
            <Tabs key={atualizarTabs} defaultActiveKey="Medicamentos" items={tabsItems} />
            {exibirGrafico && (
              <div className="grafico-container">
                <h3>Distribuição do Estoque</h3>
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
                  />
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
