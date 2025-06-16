import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import EstoquePrincipal from "./components/EstoquePrincipal";
import EstoqueVet from "./components/EstoqueVet";
import Internacao from "./components/Internacao";
import ReposicaoConsultorios from "./components/ReposicaoConsultorios";
import ImportacaoCSV from "./components/ImportacaoCSV";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transferencia from "./components/Transferencia";
import Registro from "./pages/Registro";
import RelatorioVariacaoFluxo from "./components/RelatorioVariacaoFluxo";
import PendingApproval from "./pages/PendingApproval";
import AdminPanel from "./pages/AdminPanel";
import SetupAdmin from "./components/SetupAdmin";
import AdminReset from "./pages/AdminReset";
import "./global.css";

function PrivateRoute({ children }) {
  const { currentUser, userStatus } = useAuth();
  
  // Redirecionar para login se não estiver autenticado
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirecionar para página de espera se não estiver aprovado
  if (userStatus !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }
  
  return children;
}

function AdminRoute({ children }) {
  const { currentUser, userRole } = useAuth();
  
  // Redirecionar para login se não estiver autenticado
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirecionar para dashboard se não for admin
  if (userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/admin-reset" element={<AdminReset />} />
          
          {/* Rotas administrativas */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          
          {/* Rotas privadas */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/estoque-principal"
            element={
              <PrivateRoute>
                <EstoquePrincipal />
              </PrivateRoute>
            }
          />
          <Route
            path="/estoque-vet"
            element={
              <PrivateRoute>
                <EstoqueVet />
              </PrivateRoute>
            }
          />
          <Route
            path="/estoque-internacao"
            element={
              <PrivateRoute>
                <Internacao />
              </PrivateRoute>
            }
          />
          <Route
            path="/estoque-reposicao"
            element={
              <PrivateRoute>
                <ReposicaoConsultorios />
              </PrivateRoute>
            }
          />
          <Route
            path="/transferencia"
            element={
              <PrivateRoute>
                <Transferencia />
              </PrivateRoute>
            }
          />
          <Route
            path="/registros"
            element={
              <PrivateRoute>
                <Registro />
              </PrivateRoute>
            }
          />
          <Route
            path="/importacao-csv"
            element={
              <PrivateRoute>
                <ImportacaoCSV />
              </PrivateRoute>
            }
          />
          <Route
            path="/relatorio-variacao"
            element={
              <PrivateRoute>
                <RelatorioVariacaoFluxo />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
