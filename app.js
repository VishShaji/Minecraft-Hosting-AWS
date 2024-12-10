import config from './config.js';

let idToken = null;
let serverStarted = false;

// Parse token from URL or sessionStorage
function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('id_token');
    const refreshToken = params.get('refresh_token');

    if (token && refreshToken) {
        sessionStorage.setItem('idToken', token);
        sessionStorage.setItem('refreshToken', refreshToken);
        return token;
    }
    return sessionStorage.getItem('idToken');
}

// Initialize application
function initApp() {
    const token = getTokenFromUrl();
    if (token) {
        idToken = token;
        window.history.replaceState(null, null, window.location.pathname); // Clean URL
        showServerControls();
    } else {
        showLoginButton();
    }
}

// Show login button
function showLoginButton() {
    document.getElementById('content').innerHTML = `
        <div class="container mt-5 text-center">
            <h1>Minecraft Server Manager</h1>
            <p class="lead mb-4">Manage your Minecraft server with ease</p>
            <button onclick="login()" class="btn btn-primary btn-lg">Login with AWS</button>
        </div>
    `;
}

// Show server controls
function showServerControls() {
    document.getElementById('content').innerHTML = `
        <div class="container mt-5">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1>Minecraft Server Manager</h1>
                <button onclick="logout()" class="btn btn-outline-danger">Logout</button>
            </div>
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Server Status</h5>
                    <div class="d-flex align-items-center mb-3">
                        <span class="status-indicator" id="statusIndicator"></span>
                        <p id="status-message" class="card-text mb-0">Checking status...</p>
                    </div>
                    <p id="ip-address" class="card-text mb-3"></p>
                    <div class="btn-group">
                        <button onclick="startServer()" id="start-btn" class="btn btn-success" disabled>Start Server</button>
                        <button onclick="stopServer()" id="stop-btn" class="btn btn-danger" disabled>Stop Server</button>
                        <button onclick="deleteServer()" id="delete-btn" class="btn btn-warning" disabled>Delete Server</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    updateServerStatus();
    setInterval(updateServerStatus, 30000); // Poll every 30 seconds
}

// Redirect to Cognito login
function login() {
    const cognitoDomain = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const queryParams = new URLSearchParams({
        client_id: config.cognito.ClientId,
        response_type: config.cognito.ResponseType,
        scope: 'openid',
        redirect_uri: config.cognito.RedirectUri
    });
    window.location.href = `${cognitoDomain}/login?${queryParams.toString()}`;
}

// Handle logout
function logout() {
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('refreshToken');
    idToken = null;
    const cognitoDomain = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const queryParams = new URLSearchParams({
        client_id: config.cognito.ClientId,
        logout_uri: config.cognito.RedirectUri
    });
    window.location.href = `${cognitoDomain}/logout?${queryParams.toString()}`;
}

// Refresh token
async function refreshToken() {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.error('Refresh token missing. Logging out.');
        return logout();
    }

    try {
        const response = await fetch(`https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: config.cognito.ClientId,
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            console.error('Failed to refresh token. Logging out.');
            return logout();
        }

        const data = await response.json();
        sessionStorage.setItem('idToken', data.id_token);
        idToken = data.id_token;
    } catch (error) {
        console.error('Token refresh failed:', error.message);
        logout();
    }
}

// Make authenticated requests
async function makeAuthenticatedRequest(endpoint, method = 'GET') {
    try {
        if (!idToken) await refreshToken();

        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
            method: method,
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.error('Authentication expired. Logging out.');
                logout();
            }
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
}

// Update server status
async function updateServerStatus() {
    try {
        const statusMessage = document.getElementById('status-message');
        const statusIndicator = document.getElementById('statusIndicator');
        const ipAddress = document.getElementById('ip-address');

        if (!statusMessage || !statusIndicator || !ipAddress) {
            console.warn('DOM elements not ready for update.');
            return;
        }

        const result = await makeAuthenticatedRequest(config.api.endpoints.status);
        statusMessage.textContent = `Server is ${result.status}`;
        statusIndicator.className = `status-indicator ${result.status === 'RUNNING' ? 'status-running' : 'status-stopped'}`;
        ipAddress.innerHTML = result.ip_address
            ? `<div class="input-group">
                    <input type="text" class="form-control" value="${result.ip_address}:25565" readonly>
                    <button class="btn btn-outline-secondary" onclick="copyToClipboard('${result.ip_address}:25565')">Copy</button>
               </div>`
            : '';

        document.getElementById('start-btn').disabled = result.status === 'RUNNING';
        document.getElementById('stop-btn').disabled = result.status !== 'RUNNING';
        document.getElementById('delete-btn').disabled = !(serverStarted || result.status === 'RUNNING');
        if (result.status === 'RUNNING') serverStarted = true;
    } catch (error) {
        console.error('Error updating status:', error.message);
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) statusMessage.textContent = `Error: ${error.message}`;
    }
}

// Start server
async function startServer() {
    try {
        document.getElementById('start-btn').disabled = true;
        document.getElementById('status-message').textContent = 'Starting server...';
        await makeAuthenticatedRequest(config.api.endpoints.start, 'POST');
        updateServerStatus();
    } catch (error) {
        console.error('Error starting server:', error.message);
    }
}

// Stop server
async function stopServer() {
    try {
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('status-message').textContent = 'Stopping server...';
        await makeAuthenticatedRequest(config.api.endpoints.stop, 'POST');
        updateServerStatus();
    } catch (error) {
        console.error('Error stopping server:', error.message);
    }
}

// Delete server
async function deleteServer() {
    try {
        if (confirm('Are you sure you want to delete the server?')) {
            document.getElementById('delete-btn').disabled = true;
            document.getElementById('status-message').textContent = 'Deleting server...';
            await makeAuthenticatedRequest(config.api.endpoints.delete, 'DELETE');
            alert('Server deleted successfully.');
            serverStarted = false;
            updateServerStatus();
        }
    } catch (error) {
        console.error('Error deleting server:', error.message);
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => console.error('Failed to copy:', err));
}

// Initialize app on load
window.onload = initApp;

// Export global functions
window.login = login;
window.logout = logout;
window.startServer = startServer;
window.stopServer = stopServer;
window.deleteServer = deleteServer;
window.copyToClipboard = copyToClipboard;
