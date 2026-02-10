import { App } from '@modelcontextprotocol/ext-apps';

let catalogServers: any[] = [];
let filteredServers: any[] = [];
let profiles: any[] = [];
let selectedServer: any = null;

// Create app instance
const app = new App({
  name: 'MCP Catalog Browser',
  version: '1.0.0'
});

// Set up event handlers BEFORE connecting
app.onerror = (error) => {
  console.error('App error:', error);
  showMessage(`Error: ${error}`, 'error');
};

// Call MCP tools through the SDK
async function callTool(toolName: string, args: any = {}) {
  const result = await app.callServerTool({
    name: toolName,
    arguments: args
  });

  return result;
}

// Show message
function showMessage(text: string, type: 'info' | 'success' | 'error' = 'info') {
  const msgEl = document.getElementById('message');
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.className = `message ${type}`;
  msgEl.classList.remove('hidden');
  setTimeout(() => {
    msgEl.classList.add('hidden');
  }, 5000);
}

// Modal functions
function closeModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showModal(modalId: string) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

// Tab switching
function switchTab(tab: string) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (tab === 'catalog') {
    document.querySelector('.tab:nth-child(1)')?.classList.add('active');
    document.getElementById('catalog-tab')?.classList.add('active');
  } else if (tab === 'profiles') {
    document.querySelector('.tab:nth-child(2)')?.classList.add('active');
    document.getElementById('profiles-tab')?.classList.add('active');
    loadProfiles();
  }
}

// Load catalog
async function loadCatalog() {
  const loadingEl = document.getElementById('catalog-loading');
  const gridEl = document.getElementById('catalog-grid');
  const emptyEl = document.getElementById('catalog-empty');

  try {
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (gridEl) gridEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.add('hidden');

    const result = await callTool('mcp-list-catalog', {});
    const resultText = result.content[0].text;
    catalogServers = JSON.parse(resultText);
    filteredServers = [...catalogServers];

    renderCatalog();
  } catch (err: any) {
    showMessage(`Failed to load catalog: ${err.message}`, 'error');
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

// Render catalog
function renderCatalog() {
  const gridEl = document.getElementById('catalog-grid');
  const emptyEl = document.getElementById('catalog-empty');

  if (!gridEl || !emptyEl) return;

  gridEl.innerHTML = '';

  if (filteredServers.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  filteredServers.forEach(server => {
    const card = document.createElement('div');
    card.className = 'server-card';
    card.onclick = () => showServerDetail(server);

    const name = document.createElement('div');
    name.className = 'server-name';
    name.textContent = server.title || server.name;

    const desc = document.createElement('div');
    desc.className = 'server-description';
    desc.textContent = server.description || 'No description';

    const tags = document.createElement('div');
    tags.className = 'server-tags';
    if (server.categories && server.categories.length > 0) {
      server.categories.forEach((cat: string) => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = cat;
        tags.appendChild(tag);
      });
    }

    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(tags);
    gridEl.appendChild(card);
  });
}

// Filter catalog
function filterCatalog() {
  const searchInput = document.getElementById('catalog-search') as HTMLInputElement;
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase();

  if (query === '') {
    filteredServers = [...catalogServers];
  } else {
    filteredServers = catalogServers.filter(server => {
      return (server.name && server.name.toLowerCase().includes(query)) ||
             (server.title && server.title.toLowerCase().includes(query)) ||
             (server.description && server.description.toLowerCase().includes(query)) ||
             (server.categories && server.categories.some((cat: string) => cat.toLowerCase().includes(query)));
    });
  }

  renderCatalog();
}

// Show server detail
function showServerDetail(server: any) {
  selectedServer = server;
  const title = document.getElementById('server-modal-title');
  const body = document.getElementById('server-modal-body');

  if (!title || !body) return;

  title.textContent = server.title || server.name;

  let html = `
    <p style="margin-bottom: 1rem;"><strong>Name:</strong> ${server.name}</p>
    <p style="margin-bottom: 1rem;"><strong>Description:</strong> ${server.description || 'No description'}</p>
  `;

  if (server.categories && server.categories.length > 0) {
    html += `<p style="margin-bottom: 1rem;"><strong>Categories:</strong> ${server.categories.join(', ')}</p>`;
  }

  if (server.secrets && server.secrets.length > 0) {
    html += `<p style="margin-bottom: 1rem;"><strong>Required Secrets:</strong> ${server.secrets.map((s: any) => s.name).join(', ')}</p>`;
  }

  if (server.config && server.config.length > 0) {
    html += `<p style="margin-bottom: 1rem;"><strong>Configuration Required:</strong> Yes</p>`;
  }

  html += `
    <div style="margin-top: 1.5rem;">
      <button class="btn" onclick="addServerToSession()">Add to Session</button>
    </div>
  `;

  body.innerHTML = html;
  showModal('server-modal');
}

// Add server to session
async function addServerToSession() {
  if (!selectedServer) return;

  try {
    closeModal('server-modal');
    showMessage('Adding server to session...', 'info');

    await callTool('mcp-add', {
      name: selectedServer.name,
      activate: true
    });

    showMessage(`Successfully added ${selectedServer.name} to session!`, 'success');
  } catch (err: any) {
    showMessage(`Failed to add server: ${err.message}`, 'error');
  }
}

// Load profiles
async function loadProfiles() {
  const loadingEl = document.getElementById('profiles-loading');
  const listEl = document.getElementById('profiles-list');
  const emptyEl = document.getElementById('profiles-empty');

  try {
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (listEl) listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.add('hidden');

    const result = await callTool('mcp-list-profiles', {});
    const resultText = result.content[0].text;
    profiles = JSON.parse(resultText);

    renderProfiles();
  } catch (err: any) {
    showMessage(`Failed to load profiles: ${err.message}`, 'error');
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}

// Render profiles
function renderProfiles() {
  const listEl = document.getElementById('profiles-list');
  const emptyEl = document.getElementById('profiles-empty');

  if (!listEl || !emptyEl) return;

  listEl.innerHTML = '';

  if (profiles.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  profiles.forEach(profile => {
    const item = document.createElement('div');
    item.className = 'profile-item';

    const info = document.createElement('div');
    info.className = 'profile-info';

    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;

    const meta = document.createElement('div');
    meta.className = 'profile-meta';
    meta.textContent = `${profile.server_count} server(s)`;

    info.appendChild(name);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'profile-actions';

    const activateBtn = document.createElement('button');
    activateBtn.className = 'btn btn-small';
    activateBtn.textContent = 'Activate';
    activateBtn.onclick = () => activateProfile(profile.id, profile.name);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-small btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteProfile(profile.id, profile.name);

    actions.appendChild(activateBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    listEl.appendChild(item);
  });
}

// Show create profile modal
function showCreateProfileModal() {
  const input = document.getElementById('new-profile-name') as HTMLInputElement;
  if (input) input.value = '';
  showModal('create-profile-modal');
}

// Create profile
async function createProfile() {
  const input = document.getElementById('new-profile-name') as HTMLInputElement;
  if (!input) return;

  const name = input.value.trim();

  if (!name) {
    showMessage('Please enter a profile name', 'error');
    return;
  }

  try {
    closeModal('create-profile-modal');
    showMessage('Creating profile...', 'info');

    await callTool('mcp-create-profile', { name });

    showMessage(`Successfully created profile '${name}'!`, 'success');
    loadProfiles();
  } catch (err: any) {
    showMessage(`Failed to create profile: ${err.message}`, 'error');
  }
}

// Activate profile
async function activateProfile(id: string, name: string) {
  if (!confirm(`Activate profile '${name}'?`)) return;

  try {
    showMessage(`Activating profile '${name}'...`, 'info');

    await callTool('mcp-activate-profile', { name: id });

    showMessage(`Successfully activated profile '${name}'!`, 'success');
  } catch (err: any) {
    showMessage(`Failed to activate profile: ${err.message}`, 'error');
  }
}

// Delete profile
async function deleteProfile(id: string, name: string) {
  if (!confirm(`Delete profile '${name}'? This cannot be undone.`)) return;

  try {
    showMessage(`Deleting profile '${name}'...`, 'info');

    await callTool('mcp-delete-profile', { id });

    showMessage(`Successfully deleted profile '${name}'!`, 'success');
    loadProfiles();
  } catch (err: any) {
    showMessage(`Failed to delete profile: ${err.message}`, 'error');
  }
}

// Export to window for inline handlers
(window as any).switchTab = switchTab;
(window as any).filterCatalog = filterCatalog;
(window as any).showServerDetail = showServerDetail;
(window as any).addServerToSession = addServerToSession;
(window as any).closeModal = closeModal;
(window as any).showCreateProfileModal = showCreateProfileModal;
(window as any).createProfile = createProfile;
(window as any).activateProfile = activateProfile;
(window as any).deleteProfile = deleteProfile;

// Connect to host and initialize
app.connect().then(() => {
  console.log('App connected to host');

  // Load initial data
  loadCatalog().catch(err => {
    console.error('Failed to load catalog:', err);
  });

  loadProfiles().catch(err => {
    console.error('Failed to load profiles:', err);
  });
}).catch(err => {
  console.error('Failed to connect app:', err);
  showMessage('Failed to connect app: ' + err.message, 'error');
});
