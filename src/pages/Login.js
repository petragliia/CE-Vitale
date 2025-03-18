import React, { useState } from "react";
import { Form, Input, Button, Divider } from "antd";
import { UserOutlined, LockOutlined, GoogleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import "./Login.css";
import logoImage from "../images/Logo2.jpeg"; // Ajuste para o nome real do seu arquivo
import { registrarOperacao } from "../services/registroService";

function Login() {
  const [form] = Form.useForm();
  // Não estamos usando o contexto Auth diretamente neste componente
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setError("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, values.email, values.password);
      
      // Registrar o login
      await registrarOperacao(
        values.email,
        'login',
        'Sistema',
        'Login com Email e Senha'
      );
      
      navigate("/dashboard");
    } catch (error) {
      setError("Falha no login: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Registrar o login com Google
      await registrarOperacao(
        result.user.email,
        'login',
        'Sistema',
        'Login com Google'
      );
      
      // Se chegou aqui, o login foi bem-sucedido
      console.log("Login com Google bem-sucedido:", result.user);
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro no login com Google:", error);
      setError("Falha no login com Google: " + error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <img src={logoImage} alt="Vitale Logo" className="logo" />
          </div>
          <h1>Vitale Controle de Estoque</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="email"
            rules={[
              {
                required: true,
                message: "Por favor, insira seu e-mail!",
              },
              {
                type: "email",
                message: "E-mail inválido!",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="E-mail"
              className="login-form-input"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: "Por favor, insira sua senha!",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Senha"
              className="login-form-input"
            />
          </Form.Item>

          <div className="forgot-password">
            <a href="#reset">Esqueceu a senha?</a>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="login-form-button"
              loading={loading}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>ou</Divider>

        <Button
          className="google-login-button"
          onClick={handleGoogleLogin}
          loading={googleLoading}
          icon={<GoogleOutlined />}
        >
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}

export default Login;