import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from "./components/dashboard/Dashboard";
//import { CreditCard } from "./components/dashboard/creditCard.tsx";
import { BankStatement } from "./components/dashboard/bankStatement.tsx";
import { CreditScoring } from "./components/dashboard/creditScoring";
import { apiService, type User } from './services/api';
import { FraudDetection } from "./components/dashboard/fraudDetection.tsx";
import Customers  from "./components/dashboard/Customers.tsx";
import Admins  from "./components/dashboard/Admins.tsx";
import ModifyStatement from './components/dashboard/ModifyStatement';
import '@n8n/chat/style.css';
import ReactDOM from 'react-dom/client';
import './index.css'; // Import the CSS file with Tailwind directives

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const currentUser = await apiService.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch (error) {
          apiService.logout();
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleAuthSuccess = async () => {
    const currentUser = await apiService.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setUser(undefined);
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {isAuthenticated && user ? (
        <Routes>
          <Route path="/" element={<Dashboard onLogout={handleLogout} />} />
          <Route path="/creditScoring" element={<CreditScoring user={user} />} />
        <Route path="/modify-statement/:statementId" element={<ModifyStatement />} />
          { /*<Route path="/creditCard" element={<CreditCard user={user} />} />*/}
          <Route path="/bankStatement" element={<BankStatement user={user} />} /> 
          <Route path="/fraudDetection" element={<FraudDetection />} /> 
          <Route path="/customers" element={<Customers />} /> 
          <Route path="/admins" element={<Admins />} /> 
        </Routes>
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
    </Router>
  );
}

export default App;
