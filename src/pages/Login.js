import React, { useState } from "react";
import { Form, Input, Button, Divider, Tabs } from "antd";
import { UserOutlined, LockOutlined, GoogleOutlined, MailOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, signInWithEmailWithRetry } from "../firebaseConfig";
import "./Login.css";
import logoImage from "../images/Logo2.jpeg"; // Ajuste para o nome real do seu arquivo
import { registrarOperacao } from "../services/registroService";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  // Estado para controlar qual aba está ativa (login ou cadastro)
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signup, salvarNomeUsuario } = useAuth();

  // Função para lidar com login
  const onLoginFinish = async (values) => {
    try {
      setError("");
      setLoading(true);
      // Usando a função com retry em vez da função padrão
      await signInWithEmailWithRetry(values.email, values.password);
      
      // Registrar o login
      await registrarOperacao(
        values.email,
        'login',
        'Sistema',
        'Login com Email e Senha'
      );
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro no login:", error.code, error.message);
      
      // Melhor tratamento de erros específicos
      if (error.code === 'auth/network-request-failed') {
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError("E-mail ou senha inválidos");
      } else {
        setError("Falha no login: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com cadastro
  const onRegisterFinish = async (values) => {
    try {
      setError("");
      setLoading(true);
      
      // Criar o usuário com email, senha e nome
      const userCredential = await signup(values.email, values.password, values.name);
      
      // Se o nome não foi definido durante o signup, salvar separadamente
      if (values.name && userCredential.user) {
        await salvarNomeUsuario(userCredential.user.uid, values.name);
      }
      
      // Registrar o cadastro
      await registrarOperacao(
        values.email,
        'cadastro',
        'Sistema',
        'Cadastro com Email e Senha'
      );
      
      // Notificar e navegar
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError("E-mail já está em uso. Faça login ou use outro e-mail.");
      } else if (error.code === 'auth/weak-password') {
        setError("Senha muito fraca. Use pelo menos 6 caracteres.");
      } else {
        setError("Falha no cadastro: " + error.message);
      }
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

  const handleTabChange = (key) => {
    setActiveTab(key);
    setError(""); // Limpar erros ao trocar de aba
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

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          centered
          className="login-tabs"
        >
          <Tabs.TabPane tab="Login" key="login">
            <Form
              form={loginForm}
              name="login"
              onFinish={onLoginFinish}
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
                  prefix={<MailOutlined />}
                  placeholder="E-mail"
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
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Cadastro" key="register">
            <Form
              form={registerForm}
              name="register"
              onFinish={onRegisterFinish}
              layout="vertical"
              autoComplete="off"
            >
              <Form.Item
                name="name"
                rules={[
                  {
                    required: true,
                    message: "Por favor, insira seu nome!",
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Nome completo"
                />
              </Form.Item>
              
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
                  prefix={<MailOutlined />}
                  placeholder="E-mail"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  {
                    required: true,
                    message: "Por favor, insira sua senha!",
                  },
                  {
                    min: 6,
                    message: "A senha deve ter no mínimo 6 caracteres!",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Senha"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  {
                    required: true,
                    message: "Por favor, confirme sua senha!",
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('As senhas não coincidem!'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirme a senha"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-form-button"
                  loading={loading}
                >
                  Cadastrar
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </div>
  );
}

export default Login;