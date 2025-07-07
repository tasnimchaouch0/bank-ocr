import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-vh-100 gradient-bg d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            {/* Logo/Brand */}
            <div className="text-center mb-4">
              <div className="bg-primary rounded-circle p-3 d-inline-flex mb-3">
                <i className="bi bi-bank text-white fs-2"></i>
              </div>
              <h1 className="h3 fw-bold text-dark">BankOCR Pro</h1>
              <p className="text-muted">Secure Bank Statement Processing</p>
            </div>

            {/* Auth Form */}
            {isLogin ? (
              <LoginForm
                onSuccess={onAuthSuccess}
                onSwitchToRegister={() => setIsLogin(false)}
              />
            ) : (
              <RegisterForm
                onSuccess={onAuthSuccess}
                onSwitchToLogin={() => setIsLogin(true)}
              />
            )}

            {/* Security Notice */}
            <div className="text-center mt-4">
              <div className="d-flex justify-content-center align-items-center text-muted small">
                <i className="bi bi-shield-check me-2"></i>
                <span>Your data is encrypted and secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};