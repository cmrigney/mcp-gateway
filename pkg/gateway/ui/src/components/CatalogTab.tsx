import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import type { CallToolFn } from '../hooks/useMcpApp';

interface Server {
  name: string;
  title?: string;
  description?: string;
  categories?: string[];
  secrets?: { name: string }[];
  config?: unknown[];
}

interface CatalogTabProps {
  isConnected: boolean;
  callTool: CallToolFn;
  showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
}

export function CatalogTab({ isConnected, callTool, showMessage }: CatalogTabProps) {
  const [servers, setServers] = useState<Server[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    setLoading(true);
    callTool('mcp-list-catalog', {})
      .then((result) => {
        const resultText = (result.content[0] as { text: string }).text;
        setServers(JSON.parse(resultText));
      })
      .catch((err: Error) => {
        showMessage(`Failed to load catalog: ${err.message}`, 'error');
      })
      .finally(() => setLoading(false));
  }, [isConnected, callTool, showMessage]);

  const filtered = useMemo(() => {
    if (!search) return servers;
    const q = search.toLowerCase();
    return servers.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.categories?.some((c) => c.toLowerCase().includes(q))
    );
  }, [servers, search]);

  const addServerToSession = async (server: Server) => {
    try {
      setSelectedServer(null);
      showMessage('Adding server to session...', 'info');
      await callTool('mcp-add', { name: server.name, activate: true });
      showMessage(`Successfully added ${server.name} to session!`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMessage(`Failed to add server: ${message}`, 'error');
    }
  };

  return (
    <>
      <input
        type="text"
        className="search-box"
        placeholder="Search servers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading catalog...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>No servers found</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="server-grid">
          {filtered.map((server) => (
            <div
              key={server.name}
              className="server-card"
              onClick={() => setSelectedServer(server)}
            >
              <div className="server-name">{server.title || server.name}</div>
              <div className="server-description">
                {server.description || 'No description'}
              </div>
              {server.categories && server.categories.length > 0 && (
                <div className="server-tags">
                  {server.categories.map((cat) => (
                    <span key={cat} className="tag">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedServer && (
        <Modal
          title={selectedServer.title || selectedServer.name}
          onClose={() => setSelectedServer(null)}
        >
          <p style={{ marginBottom: '1rem' }}>
            <strong>Name:</strong> {selectedServer.name}
          </p>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Description:</strong>{' '}
            {selectedServer.description || 'No description'}
          </p>
          {selectedServer.categories && selectedServer.categories.length > 0 && (
            <p style={{ marginBottom: '1rem' }}>
              <strong>Categories:</strong>{' '}
              {selectedServer.categories.join(', ')}
            </p>
          )}
          {selectedServer.secrets && selectedServer.secrets.length > 0 && (
            <p style={{ marginBottom: '1rem' }}>
              <strong>Required Secrets:</strong>{' '}
              {selectedServer.secrets.map((s) => s.name).join(', ')}
            </p>
          )}
          {selectedServer.config && selectedServer.config.length > 0 && (
            <p style={{ marginBottom: '1rem' }}>
              <strong>Configuration Required:</strong> Yes
            </p>
          )}
          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn"
              onClick={() => addServerToSession(selectedServer)}
            >
              Add to Session
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
