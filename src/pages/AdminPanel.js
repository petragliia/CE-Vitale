import React, { useState, useEffect } from "react";
import { 
  Table, Button, Space, Tag, Card, Typography, 
  Popconfirm, message, Select, Modal, 
  Form, Input, Spin
} from "antd";
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  UserOutlined, 
  UserAddOutlined, 
  LockOutlined,
  MailOutlined,
  EditOutlined,
  HomeOutlined
} from "@ant-design/icons";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import "./AdminPanel.css";

const { Title, Text } = Typography;
const { Option } = Select;

function AdminPanel() {
  const { 
    listarUsuarios, 
    atualizarStatusUsuario, 
    atualizarRoleUsuario,
    salvarNomeUsuario
  } = useAuth();
  
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [formCreateUser] = Form.useForm();
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Carregar lista de usuários
  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const listaUsuarios = await listarUsuarios();
      setUsuarios(listaUsuarios);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      message.error("Não foi possível carregar a lista de usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aprovar usuário
  const aprovarUsuario = async (uid) => {
    try {
      await atualizarStatusUsuario(uid, "approved");
      message.success("Usuário aprovado com sucesso");
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
      message.error("Não foi possível aprovar o usuário");
    }
  };

  // Rejeitar usuário
  const rejeitarUsuario = async (uid) => {
    try {
      await atualizarStatusUsuario(uid, "rejected");
      message.success("Usuário rejeitado com sucesso");
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao rejeitar usuário:", error);
      message.error("Não foi possível rejeitar o usuário");
    }
  };

  // Alterar função/papel do usuário
  const alterarRole = async (uid, novaRole) => {
    try {
      await atualizarRoleUsuario(uid, novaRole);
      message.success("Função do usuário alterada com sucesso");
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao alterar função do usuário:", error);
      message.error("Não foi possível alterar a função do usuário");
    }
  };

  // Abrir modal para criar usuário
  const showCreateUserModal = () => {
    setEditMode(false);
    setSelectedUser(null);
    formCreateUser.resetFields();
    setModalVisible(true);
  };

  // Abrir modal para editar usuário
  const showEditUserModal = (user) => {
    setEditMode(true);
    setSelectedUser(user);
    formCreateUser.setFieldsValue({
      name: user.nome,
      email: user.email || "",
      role: user.role || "user"
    });
    setModalVisible(true);
  };

  // Criar ou editar usuário
  const handleCreateUser = async (values) => {
    try {
      if (editMode && selectedUser) {
        // Editar usuário existente
        await atualizarRoleUsuario(selectedUser.uid, values.role);
        await salvarNomeUsuario(selectedUser.uid, values.name, values.role, selectedUser.status || "pending");
        message.success("Usuário atualizado com sucesso");
      } else {
        // Criar novo usuário
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await updateProfile(userCredential.user, {
          displayName: values.name
        });
        await salvarNomeUsuario(
          userCredential.user.uid, 
          values.name, 
          values.role, 
          values.status || "approved"
        );
        message.success("Usuário criado com sucesso");
      }
      setModalVisible(false);
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao criar/editar usuário:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        message.error("E-mail já está em uso.");
      } else if (error.code === 'auth/weak-password') {
        message.error("Senha muito fraca. Use pelo menos 6 caracteres.");
      } else {
        message.error("Erro ao criar/editar usuário: " + error.message);
      }
    }
  };

  // Colunas da tabela
  const columns = [
    {
      title: "Nome",
      dataIndex: "nome",
      key: "nome",
      render: (text, record) => text || record.email || "Sem nome"
    },
    {
      title: "E-mail",
      dataIndex: "email",
      key: "email"
    },
    {
      title: "Função",
      dataIndex: "role",
      key: "role",
      render: (text) => {
        const roleText = text === "admin" ? "Administrador" : "Usuário";
        return <Tag color={text === "admin" ? "gold" : "blue"}>{roleText}</Tag>;
      },
      filters: [
        { text: "Administrador", value: "admin" },
        { text: "Usuário", value: "user" }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color = "default";
        let text = "Desconhecido";
        
        switch (status) {
          case "approved":
            color = "success";
            text = "Aprovado";
            break;
          case "pending":
            color = "processing";
            text = "Pendente";
            break;
          case "rejected":
            color = "error";
            text = "Rejeitado";
            break;
          default:
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: "Aprovado", value: "approved" },
        { text: "Pendente", value: "pending" },
        { text: "Rejeitado", value: "rejected" }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: "Criado em",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => date ? new Date(date.seconds * 1000).toLocaleString() : "Desconhecido"
    },
    {
      title: "Ações",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          {record.status !== "approved" && (
            <Popconfirm
              title="Tem certeza que deseja aprovar este usuário?"
              onConfirm={() => aprovarUsuario(record.uid)}
              okText="Sim"
              cancelText="Não"
            >
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                title="Aprovar"
              />
            </Popconfirm>
          )}
          
          {record.status !== "rejected" && (
            <Popconfirm
              title="Tem certeza que deseja rejeitar este usuário?"
              onConfirm={() => rejeitarUsuario(record.uid)}
              okText="Sim"
              cancelText="Não"
            >
              <Button 
                danger 
                size="small" 
                icon={<CloseCircleOutlined />}
                title="Rejeitar"
              />
            </Popconfirm>
          )}
          
          <Popconfirm
            title="Alterar função do usuário"
            onConfirm={() => alterarRole(record.uid, record.role === "admin" ? "user" : "admin")}
            okText="Sim"
            cancelText="Não"
          >
            <Button 
              size="small" 
              icon={<UserOutlined />}
              title={record.role === "admin" ? "Tornar usuário comum" : "Tornar administrador"}
            >
              {record.role === "admin" ? "→ Usuário" : "→ Admin"}
            </Button>
          </Popconfirm>
          
          <Button 
            type="default" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => showEditUserModal(record)}
            title="Editar usuário"
          />
        </Space>
      )
    }
  ];

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }} className="admin-header-container">
          <div className="admin-title">
            <Title level={3} style={{ margin: 0 }}>Painel de Administração</Title>
            <Text type="secondary">Gerenciamento de Usuários</Text>
          </div>
          <Space className="admin-header-buttons">
            <Button 
              icon={<HomeOutlined />}
              href="/dashboard"
            >
              Voltar ao Dashboard
            </Button>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />} 
              onClick={showCreateUserModal}
            >
              Criar Usuário
            </Button>
          </Space>
        </div>
      </div>
      
      <Card className="admin-card">
        <Title level={4}>Usuários do Sistema</Title>
        <Text type="secondary">
          Gerencie os usuários do sistema, aprove novos usuários e defina suas funções.
        </Text>
        
        {loading ? (
          <div className="admin-loading">
            <Spin size="large" />
            <Text>Carregando usuários...</Text>
          </div>
        ) : (
          <Table 
            dataSource={usuarios} 
            columns={columns} 
            rowKey="uid"
            pagination={{ pageSize: 10, responsive: true }}
            className="admin-table"
            scroll={{ x: 'max-content' }}
            size="small"
          />
        )}
      </Card>
      
      <Modal
        title={editMode ? "Editar Usuário" : "Criar Novo Usuário"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={formCreateUser}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="name"
            label="Nome"
            rules={[
              {
                required: true,
                message: "Por favor, insira o nome do usuário"
              }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nome completo" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="E-mail"
            rules={[
              {
                required: !editMode,
                message: "Por favor, insira o e-mail do usuário"
              },
              {
                type: "email",
                message: "E-mail inválido"
              }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="E-mail" 
              disabled={editMode}
            />
          </Form.Item>
          
          {!editMode && (
            <Form.Item
              name="password"
              label="Senha"
              rules={[
                {
                  required: true,
                  message: "Por favor, insira uma senha"
                },
                {
                  min: 6,
                  message: "A senha deve ter no mínimo 6 caracteres"
                }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Senha"
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="Função"
            initialValue="user"
          >
            <Select>
              <Option value="user">Usuário Comum</Option>
              <Option value="admin">Administrador</Option>
            </Select>
          </Form.Item>
          
          {!editMode && (
            <Form.Item
              name="status"
              label="Status Inicial"
              initialValue="approved"
            >
              <Select>
                <Option value="approved">Aprovado</Option>
                <Option value="pending">Pendente</Option>
              </Select>
            </Form.Item>
          )}
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editMode ? "Atualizar" : "Criar"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminPanel;
