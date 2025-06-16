import React, { useState } from "react";
import { Card, Form, Input, Button, message, Alert, Typography } from "antd";
import { collection, doc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

const { Title, Paragraph } = Typography;

const AdminReset = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetAdminAccess = async (values) => {
    try {
      setLoading(true);

      // Verificar código de reset
      if (values.resetCode !== "reset123") {
        message.error("Código de reset incorreto");
        return;
      }

      // Buscar usuário pelo e-mail
      const usuariosRef = collection(db, "usuarios");
      const q = query(usuariosRef, where("email", "==", values.email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        message.error("Usuário não encontrado com este e-mail");
        return;
      }

      // Atualizar o primeiro usuário encontrado para admin
      let counter = 0;
      for (const docSnap of querySnapshot.docs) {
        await updateDoc(doc(db, "usuarios", docSnap.id), {
          role: "admin",
          status: "approved"
        });
        counter++;
      }

      message.success(`${counter} conta(s) atualizada(s) para admin com sucesso!`);
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao resetar acesso de admin:", error);
      message.error("Erro ao resetar acesso de admin");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card title="Acesso Restaurado" style={{ maxWidth: 600, margin: '50px auto' }}>
        <Alert
          message="Acesso de Administrador Restaurado"
          description="O acesso de administrador foi restaurado com sucesso. Agora você pode fazer login."
          type="success"
          showIcon
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="primary" href="/login">Ir para a página de Login</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recuperar Acesso de Administrador" style={{ maxWidth: 600, margin: '50px auto' }}>
      <Typography>
        <Title level={4}>Restaurar Acesso Administrativo</Title>
        <Paragraph>
          Use este formulário para restaurar o acesso administrativo à sua conta.
          Digite seu e-mail abaixo para atribuir a função de administrador à conta.
        </Paragraph>
      </Typography>
      
      <Alert
        message="Importante"
        description="Esta página é somente para recuperação de acesso. O código de reset padrão é: reset123"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={resetAdminAccess}
      >
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
          name="resetCode"
          label="Código de Reset"
          rules={[{ required: true, message: 'Por favor, insira o código de reset' }]}
          help="Código necessário para resetar o acesso de administrador"
        >
          <Input.Password placeholder="Código de reset" />
        </Form.Item>

        <Form.Item style={{ marginTop: 16, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Restaurar Acesso de Admin
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AdminReset;
