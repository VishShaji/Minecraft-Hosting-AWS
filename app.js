import config from './config.js';

let idToken = null;

// Helper Functions

// Parse token from URL or sessionStorage
function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('id_token');
    if (token) {
        sessionStorage.setItem('idToken', token);
        return token;
    }
    return sessionStorage.getItem('idToken');
}

// Check if the token is expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp <= currentTime;
    } catch (error) {
        console.error('Error decoding token:', error);
        return true;
    }
}

// Handle API requests with authentication
async function makeAuthenticatedRequest(endpoint, method = 'GET') {
    if (!idToken || isTokenExpired(idToken)) {
        throw new Error('Authentication expired. Please login again.');
    }

    const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response;
}

// UI Rendering Functions

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

// Show user information and server controls
async function showServerControls() {
    try {
        const userResponse = await makeAuthenticatedRequest('/user-info');
        const userData = await userResponse.json();

        document.getElementById('content').innerHTML = `
            <div class="container mt-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1>Minecraft Server Manager</h1>
                    <button onclick="logout()" class="btn btn-outline-danger">Logout</button>
                </div>
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">User Information</h5>
                        <p>Email: ${userData.email}</p>
                        <p>Instance Name: ${userData.instance_name}</p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Server Status</h5>
                        <p id="status-message" class="mb-3">Checking status...</p>
                        <div class="btn-group">
                            <button onclick="startServer()" id="start-btn" class="btn btn-success" disabled>Start</button>
                            <button onclick="stopServer()" id="stop-btn" class="btn btn-danger" disabled>Stop</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        updateServerStatus();
        setInterval(updateServerStatus, 30000); // Poll server status every 30 seconds
    } catch (error) {
        console.error('Error fetching user info:', error);
        document.getElementById('content').innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger">Failed to load user information. Please try logging in again.</div>
                <button onclick="logout()" class="btn btn-primary">Login Again</button>
            </div>
        `;
    }
}

// Server Actions

// Fetch and update server status
async function updateServerStatus() {
    try {
        const response = await makeAuthenticatedRequest(config.api.endpoints.status);
        const { status } = await response.json();

        const statusMessage = status === 'RUNNING' ? 'Server is running' : 'Server is stopped';
        document.getElementById('status-message').textContent = statusMessage;

        document.getElementById('start-btn').disabled = status === 'RUNNING';
        document.getElementById('stop-btn').disabled = status !== 'RUNNING';
    } catch (error) {
        console.error('Error updating server status:', error);
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
        console.error('Error starting server:', error);
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
        console.error('Error stopping server:', error);
    }
}

// Authentication Actions

// Redirect to Cognito login
function login() {
    const cognitoUrl = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const params = new URLSearchParams({
        client_id: config.cognito.ClientId,
        response_type: 'token',
        scope: 'email openid',
        redirect_uri: config.cognito.RedirectUri,
    });
    window.location.href = `${cognitoUrl}/login?${params.toString()}`;
}

// Logout and clear session
function logout() {
    sessionStorage.removeItem('idToken');
    const cognitoUrl = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const params = new URLSearchParams({
        client_id: config.cognito.ClientId,
        logout_uri: config.cognito.RedirectUri,
    });
    window.location.href = `${cognitoUrl}/logout?${params.toString()}`;
}

// Initialize the application
function initApp() {
    idToken = getTokenFromUrl();
    if (idToken && !isTokenExpired(idToken)) {
        window.history.replaceState(null, null, window.location.pathname);
        showServerControls();
    } else {
        showLoginButton();
    }
}

// Initialize on load
window.onload = initApp;

// Export global functions for button interactions
window.login = login;
window.logout = logout;
window.startServer = startServer;
window.stopServer = stopServer;
