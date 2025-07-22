import React, { useState, useEffect } from 'react';
import { AuthPage } from './components/auth/AuthPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { apiService } from './services/api';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize n8n chat
    createChat({
      webhookUrl: 'https://tasnimchaouch.app.n8n.cloud/webhook/e21e5d94-d8c6-4592-9f41-009a63c584d0/chat',
    initialMessages: [
		'Hi there! 👋 I am Tasnim welcome to bank ocr , How can I help you ? '
	],
i18n: {
		en: {
      title: 'Hi there! 👋',
      subtitle: "Wanna know more about our page ?",
      footer: '',
      getStarted: 'New Conversation',
      inputPlaceholder: 'Type here',
      closeButtonTooltip: ''
    },
	},});

    // Check if user is already authenticated
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          await apiService.getCurrentUser();
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

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiService.logout();
    setIsAuthenticated(false);
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
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  );
}

export default App;
