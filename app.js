import config from './config.js';

// Handle authentication and server management
let idToken = null;

// Check if we have a token in the URL (after Cognito redirect)
function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('id_token');
    if (token) {
        // Store token in sessionStorage
        sessionStorage.setItem('idToken', token);
        return token;
    }
    // Check sessionStorage if no token in URL
    return sessionStorage.getItem('idToken');
}

// Initialize the application
function initApp() {
    // Check for token
    const token = getTokenFromUrl();
    if (token) {
        idToken = token;
        // Clear the URL hash if token was there
        if (window.location.hash) {
            window.history.replaceState(null, null, window.location.pathname);
        }
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
                    </div>
                </div>
            </div>
        </div>
    `;
    updateServerStatus();
    // Set up periodic status check
    setInterval(updateServerStatus, 30000);
}

// Redirect to Cognito login
function login() {
    const cognitoDomain = `https://${config.cognito.Domain}`;
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
    // Clear token from sessionStorage
    sessionStorage.removeItem('idToken');
    idToken = null;
    const cognitoDomain = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const queryParams = new URLSearchParams({
        client_id: config.cognito.ClientId,
        logout_uri: config.cognito.RedirectUri
    });
    window.location.href = `${cognitoDomain}/logout?${queryParams.toString()}`;
}

// API calls with authentication
async function makeAuthenticatedRequest(endpoint, method = 'GET') {
    try {
        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                sessionStorage.removeItem('idToken');
                showLoginButton();
                throw new Error('Authentication expired. Please login again.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return { error: error.message || 'Failed to communicate with server' };
    }
}

// Server management functions
async function updateServerStatus() {
    const result = await makeAuthenticatedRequest(config.api.endpoints.status);
    const statusMessage = document.getElementById('status-message');
    const statusIndicator = document.getElementById('statusIndicator');
    const ipAddress = document.getElementById('ip-address');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');

    if (result.error) {
        statusMessage.textContent = `Error: ${result.error}`;
        statusIndicator.className = 'status-indicator';
        ipAddress.textContent = '';
        startBtn.disabled = true;
        stopBtn.disabled = true;
        return;
    }

    statusMessage.textContent = `Server is ${result.status}`;
    statusIndicator.className = `status-indicator ${result.status === 'RUNNING' ? 'status-running' : 'status-stopped'}`;
    
    if (result.ip_address) {
        ipAddress.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control" value="${result.ip_address}:25565" readonly>
                <button class="btn btn-outline-secondary" onclick="copyToClipboard('${result.ip_address}:25565')">
                    Copy
                </button>
            </div>`;
    } else {
        ipAddress.textContent = '';
    }

    // Update buttons based on server status
    startBtn.disabled = result.status === 'RUNNING';
    stopBtn.disabled = result.status !== 'RUNNING';
}

async function startServer() {
    const startBtn = document.getElementById('start-btn');
    const statusMessage = document.getElementById('status-message');
    
    startBtn.disabled = true;
    statusMessage.textContent = 'Starting server...';
    
    const result = await makeAuthenticatedRequest(config.api.endpoints.start, 'POST');
    if (result.error) {
        statusMessage.textContent = `Error: ${result.error}`;
        startBtn.disabled = false;
        return;
    }
    
    updateServerStatus();
}

async function stopServer() {
    const stopBtn = document.getElementById('stop-btn');
    const statusMessage = document.getElementById('status-message');
    
    stopBtn.disabled = true;
    statusMessage.textContent = 'Stopping server...';
    
    const result = await makeAuthenticatedRequest(config.api.endpoints.stop, 'POST');
    if (result.error) {
        statusMessage.textContent = `Error: ${result.error}`;
        stopBtn.disabled = false;
        return;
    }
    
    updateServerStatus();
}

// Utility function to copy server address
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            const button = document.querySelector('.input-group .btn');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        })
        .catch(err => console.error('Failed to copy:', err));
}

// Make functions available globally
window.login = login;
window.logout = logout;
window.startServer = startServer;
window.stopServer = stopServer;
window.copyToClipboard = copyToClipboard;

// Initialize the app when the page loads
window.onload = initApp;
