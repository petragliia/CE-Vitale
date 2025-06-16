import React from "react";
import { Result, Button, Typography } from "antd";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./PendingApproval.css";

const { Paragraph, Text } = Typography;

function PendingApproval() {
  const { currentUser, logout, displayName } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="pending-container">
      <Result
        status="info"
        title="Aguardando Aprovação"
        subTitle={`Olá ${displayName || currentUser?.email || "usuário"}!`}
      >
        <div className="pending-content">
          <Paragraph>
            Sua conta ainda está aguardando aprovação pelo administrador do sistema.
          </Paragraph>
          <Paragraph>
            <Text strong>
              Isso pode levar algum tempo. Um administrador da clínica precisa verificar e aprovar o seu acesso.
            </Text>
          </Paragraph>
          <Paragraph>
            Se você acredita que isso é um erro ou se a aprovação está demorando muito, entre em contato com o administrador da clínica.
          </Paragraph>
          <div className="pending-actions">
            <Button type="primary" onClick={handleLogout}>
              Voltar para o Login
            </Button>
          </div>
        </div>
      </Result>
    </div>
  );
}

export default PendingApproval;
