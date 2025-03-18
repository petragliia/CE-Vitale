import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import EstoquePrincipal from "./components/EstoquePrincipal";
import EstoqueVet from "./components/EstoqueVet";
import Internacao from "./components/Internacao";
import ReposicaoConsultorios from "./components/ReposicaoConsultorios";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transferencia from "./components/Transferencia";
import Registro from "./pages/Registro";
import "./global.css";

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
