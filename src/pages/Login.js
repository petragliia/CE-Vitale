// src/pages/Login.js
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button, Input, Alert } from "antd";
import { UserOutlined, LockOutlined, GoogleOutlined } from "@ant-design/icons";
import "./Login.css";

export default function Login() {
  const { loginComGoogle, loginComEmail, erro, currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleLoginEmail = async () => {
    if (!email || !senha) {
      return;
    }
    await loginComEmail(email, senha);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">🐾 Estoque Vet</h2>
        <p className="login-subtitle">
          Gerencie seu estoque com facilidade e segurança
        </p>
        {erro && <Alert message={erro} type="error" showIcon />}
        <Button onClick={loginComGoogle} className="google-btn">
          <GoogleOutlined /> Entrar com Google
        </Button>
        <div className="divider">ou entre com e-mail</div>
        <Input
          size="large"
          placeholder="E-mail"
          prefix={<UserOutlined />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />
        <Input.Password
          size="large"
          placeholder="Senha"
          prefix={<LockOutlined />}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="login-input"
        />
        <Button onClick={handleLoginEmail} className="login-btn">
          Entrar
        </Button>
      </div>
    </div>
  );
}
