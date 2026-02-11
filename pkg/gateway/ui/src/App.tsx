import React, { useState, useEffect, useCallback } from 'react';
import { useMcpApp } from './hooks/useMcpApp';
import { CatalogTab } from './components/CatalogTab';
import { ProfilesTab } from './components/ProfilesTab';

type MessageType = 'info' | 'success' | 'error';

export function App() {
  const { isConnected, error, callTool } = useMcpApp();
  const [activeTab, setActiveTab] = useState<'catalog' | 'profiles'>('catalog');
  const [message, setMessage] = useState<{ text: string; type: MessageType } | null>(null);

  const showMessage = useCallback((text: string, type: MessageType = 'info') => {
    setMessage({ text, type });
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  if (error) {
    return (
      <div className="container">
        <h1>MCP Catalog Browser</h1>
        <div className="message error">Failed to connect: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>MCP Catalog Browser</h1>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          Browse Catalog
        </button>
        <button
          className={`tab ${activeTab === 'profiles' ? 'active' : ''}`}
          onClick={() => setActiveTab('profiles')}
        >
          Manage Profiles
        </button>
      </div>

      <div className="tab-content" style={{ display: activeTab === 'catalog' ? 'block' : 'none' }}>
        <CatalogTab
          isConnected={isConnected}
          callTool={callTool}
          showMessage={showMessage}
        />
      </div>

      <div className="tab-content" style={{ display: activeTab === 'profiles' ? 'block' : 'none' }}>
        <ProfilesTab
          isConnected={isConnected}
          callTool={callTool}
          showMessage={showMessage}
        />
      </div>
    </div>
  );
}
