
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, notification } from "antd";
import "./Login.css";

export default function Login() {
  const { loginComEmail, loginComGoogle, erro } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await loginComEmail(values.email, values.password);
      navigate("/dashboard");
    } catch (error) {
      notification.error({ message: "Erro no login", description: erro });
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <h1>Login</h1>
      <Form onFinish={onFinish} layout="vertical">
        <Form.Item name="email" label="E-mail" rules={[{ required: true, message: "Insira seu e-mail" }]}>
          <Input type="email" placeholder="seu@email" />
        </Form.Item>
        <Form.Item name="password" label="Senha" rules={[{ required: true, message: "Insira sua senha" }]}>
          <Input.Password placeholder="Sua senha" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Entrar
          </Button>
        </Form.Item>
      </Form>
      <Button onClick={loginComGoogle}>Entrar com Google</Button>
    </div>
  );
}
