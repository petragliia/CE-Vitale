import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Alert, Spin, Typography } from "antd";
import { 
  doc, setDoc, getDocs, 
  collection, query, where, limit 
} from "firebase/firestore";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

const { Title, Paragraph } = Typography;

const SetupAdmin = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [adminExiste, setAdminExiste] = useState(false);

  // Verificar se já existe algum admin no sistema
  useEffect(() => {
    const verificarAdminsExistentes = async () => {
      try {
        // Buscar usuários com role admin
        const usuariosRef = collection(db, "usuarios");
        const q = query(usuariosRef, where("role", "==", "admin"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Já existe pelo menos um admin
          setAdminExiste(true);
        }
      } catch (error) {
        console.error("Erro ao verificar administradores:", error);
        message.error("Erro ao verificar configuração de administradores");
      } finally {
        setVerificando(false);
      }
    };

    verificarAdminsExistentes();
  }, []);

  const criarAdminInicial = async (values) => {
    try {
      setLoading(true);
      
      // Senha de autorização simples (código de setup)
      if (values.codigoSetup !== "admin123") {
        message.error("Código de setup incorreto");
        return;
      }

      // Verificar se email já está em uso
      try {
        // Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.senha
        );

        const user = userCredential.user;
        
        // Atualizar nome de exibição
        await updateProfile(user, {
          displayName: values.nome
        });
        
        // Salvar no Firestore como admin
        await setDoc(doc(db, "usuarios", user.uid), {
          nome: values.nome,
          role: "admin",
          status: "approved",
          createdAt: new Date()
        });
        
        message.success("Administrador criado com sucesso! Faça login com suas novas credenciais.");
        setAdminExiste(true);
        
        // Sair para que o admin faça login
        await auth.signOut();
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        
      } catch (error) {
        console.error("Erro ao criar administrador:", error);
        if (error.code === "auth/email-already-in-use") {
          message.error("Este e-mail já está em uso");
        } else {
          message.error(`Erro ao criar administrador: ${error.message}`);
        }
      }
    } catch (error) {
      console.error("Erro ao configurar administrador:", error);
      message.error("Não foi possível configurar o administrador");
    } finally {
      setLoading(false);
    }
  };

  if (verificando) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Verificando configuração de administrador...</p>
      </div>
    );
  }

  if (adminExiste) {
    return (
      <Card title="Configuração de Administrador" style={{ maxWidth: 600, margin: '20px auto' }}>
        <Alert
          message="Administrador já configurado"
          description="Um administrador já foi configurado no sistema. Use a página de login para acessar o sistema."
          type="info"
          showIcon
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="primary" href="/login">Ir para a página de Login</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Configuração Inicial de Administrador" style={{ maxWidth: 600, margin: '20px auto' }}>
      <Typography>
        <Title level={4}>Configure o Primeiro Administrador do Sistema</Title>
        <Paragraph>
          Esta página permite criar o primeiro usuário administrador do sistema.
          Após a criação deste administrador inicial, você poderá gerenciar outros usuários
          através do painel administrativo.
        </Paragraph>
      </Typography>
      
      <Alert
        message="Instrucão importante"
        description="Esta página só deve ser usada para a configuração inicial. O código de setup padrão é: admin123"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={criarAdminInicial}
      >
        <Form.Item
          name="nome"
          label="Nome completo"
          rules={[{ required: true, message: 'Por favor, insira seu nome' }]}
        >
          <Input placeholder="Ex: João Silva" />
        </Form.Item>
        
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Por favor, insira seu email' },
            { type: 'email', message: 'Email inválido' }
          ]}
        >
          <Input placeholder="seu.email@exemplo.com" />
        </Form.Item>
        
        <Form.Item
          name="senha"
          label="Senha"
          rules={[
            { required: true, message: 'Por favor, insira uma senha' },
            { min: 6, message: 'A senha deve ter pelo menos 6 caracteres' }
          ]}
        >
          <Input.Password placeholder="Senha" />
        </Form.Item>
        
        <Form.Item
          name="confirmaSenha"
          label="Confirme a senha"
          dependencies={['senha']}
          rules={[
            { required: true, message: 'Por favor, confirme a senha' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('senha') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('As senhas não coincidem'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirme a senha" />
        </Form.Item>
        
        <Form.Item
          name="codigoSetup"
          label="Código de Setup"
          rules={[{ required: true, message: 'Por favor, insira o código de setup' }]}
          help="Código necessário para configurar o administrador inicial"
        >
          <Input.Password placeholder="Código de setup" />
        </Form.Item>

        <Form.Item style={{ marginTop: 16, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Criar Administrador
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SetupAdmin;
