
import { useNavigate } from "react-router-dom";
import { Button } from "antd";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Bem-vindo ao Controle de Estoque</h1>
      <div className="dashboard-buttons">
        <Button className="dashboard-card estoque-principal" onClick={() => navigate("/estoque-principal")}>
          <div className="card-content">
            <h2>Estocão</h2>
            <p>Gerencie o estoque Principal</p>
          </div>
        </Button>
        <Button className="dashboard-card estoque-vet" onClick={() => navigate("/estoque-vet")}>
          <div className="card-content">
            <h2>Estoquinho</h2>
            <p>Controle os itens do estoque veterinário.</p>
          </div>
        </Button>
        <Button className="dashboard-card estoque-internacao" onClick={() => navigate("/estoque-internacao")}>
          <div className="card-content">
            <h2>Internação</h2>
            <p>Gerencie o estoque de internação.</p>
          </div>
        </Button>
        <Button className="dashboard-card estoque-reposicao" onClick={() => navigate("/estoque-reposicao")}>
          <div className="card-content">
            <h2>Reposição de Consultórios</h2>
            <p>Controle os itens de reposição.</p>
          </div>
        </Button>
      </div>
    </div>
  );
}
