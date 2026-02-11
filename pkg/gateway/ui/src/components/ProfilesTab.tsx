import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import type { CallToolFn } from '../hooks/useMcpApp';

interface Profile {
  id: string;
  name: string;
  server_count: number;
}

interface ProfilesTabProps {
  isConnected: boolean;
  callTool: CallToolFn;
  showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
}

export function ProfilesTab({ isConnected, callTool, showMessage }: ProfilesTabProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const loadProfiles = useCallback(async () => {
    if (!isConnected) return;

    setLoading(true);
    try {
      const result = await callTool('mcp-list-profiles', {});
      const resultText = (result.content[0] as { text: string }).text;
      setProfiles(JSON.parse(resultText));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMessage(`Failed to load profiles: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isConnected, callTool, showMessage]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const createProfile = async () => {
    const name = newProfileName.trim();
    if (!name) {
      showMessage('Please enter a profile name', 'error');
      return;
    }

    try {
      setShowCreateModal(false);
      showMessage('Creating profile...', 'info');
      await callTool('mcp-create-profile', { name });
      showMessage(`Successfully created profile '${name}'!`, 'success');
      loadProfiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMessage(`Failed to create profile: ${message}`, 'error');
    }
  };

  const activateProfile = async (id: string, name: string) => {
    if (!confirm(`Activate profile '${name}'?`)) return;

    try {
      showMessage(`Activating profile '${name}'...`, 'info');
      await callTool('mcp-activate-profile', { name: id });
      showMessage(`Successfully activated profile '${name}'!`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMessage(`Failed to activate profile: ${message}`, 'error');
    }
  };

  const deleteProfile = async (id: string, name: string) => {
    if (!confirm(`Delete profile '${name}'? This cannot be undone.`)) return;

    try {
      showMessage(`Deleting profile '${name}'...`, 'info');
      await callTool('mcp-delete-profile', { id });
      showMessage(`Successfully deleted profile '${name}'!`, 'success');
      loadProfiles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showMessage(`Failed to delete profile: ${message}`, 'error');
    }
  };

  return (
    <>
      <button
        className="btn"
        onClick={() => {
          setNewProfileName('');
          setShowCreateModal(true);
        }}
        style={{ marginBottom: '1rem' }}
      >
        Create New Profile
      </button>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading profiles...</p>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>No profiles yet. Create one to get started!</p>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="profile-list">
          {profiles.map((profile) => (
            <div key={profile.id} className="profile-item">
              <div className="profile-info">
                <div className="profile-name">{profile.name}</div>
                <div className="profile-meta">
                  {profile.server_count} server(s)
                </div>
              </div>
              <div className="profile-actions">
                <button
                  className="btn btn-small"
                  onClick={() => activateProfile(profile.id, profile.name)}
                >
                  Activate
                </button>
                <button
                  className="btn btn-small btn-danger"
                  onClick={() => deleteProfile(profile.id, profile.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal title="Create Profile" onClose={() => setShowCreateModal(false)}>
          <div className="form-group">
            <label className="form-label">Profile Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="my-profile"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
          </div>
          <button className="btn" onClick={createProfile}>
            Create Profile
          </button>
        </Modal>
      )}
    </>
  );
}
