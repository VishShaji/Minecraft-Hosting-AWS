import config from './config.js';

let idToken = null;
let serverStarted = false; // Track if the server has been started

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
    idToken = null;
    const cognitoDomain = `https://${config.cognito.Domain}.auth.${config.cognito.Region}.amazoncognito.com`;
    const queryParams = new URLSearchParams({
        client_id: config.cognito.ClientId,
        logout_uri: config.cognito.RedirectUri
    });
    window.location.href = `${cognitoDomain}/logout?${queryParams.toString()}`;
}

// Make authenticated requests
async function makeAuthenticatedRequest(endpoint, method = 'GET') {
    try {
        if (!idToken) throw new Error('No authentication token found. Please login.');

        const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
            method: method,
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.removeItem('idToken');
                showLoginButton();
                throw new Error('Authentication expired. Please login again.');
            }
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error.message);
        throw error;
    }
}

// Update server status
async function updateServerStatus() {
    try {
        const result = await makeAuthenticatedRequest(config.api.endpoints.status);
        document.getElementById('status-message').textContent = `Server is ${result.status}`;
        document.getElementById('statusIndicator').className = `status-indicator ${result.status === 'RUNNING' ? 'status-running' : 'status-stopped'}`;
        
        // Update IP address display
        document.getElementById('ip-address').innerHTML = result.ip_address
            ? `<div class="input-group">
                    <input type="text" class="form-control" value="${result.ip_address}:25565" readonly>
                    <button class="btn btn-outline-secondary" onclick="copyToClipboard('${result.ip_address}:25565')">Copy</button>
               </div>`
            : '';

        // Enable/disable buttons based on server status
        document.getElementById('start-btn').disabled = result.status === 'RUNNING';
        document.getElementById('stop-btn').disabled = result.status !== 'RUNNING';
        
        // Enable delete button only if server has been started at least once
        if (result.status === 'RUNNING') {
            serverStarted = true; // Mark that the server has been started at least once
            document.getElementById('delete-btn').disabled = false; // Enable delete button
        } else if (serverStarted) {
            document.getElementById('delete-btn').disabled = false; // Keep delete button enabled if server was started before
        } else {
            document.getElementById('delete-btn').disabled = true; // Disable delete button if never started
        }

    } catch (error) {
        document.getElementById('status-message').textContent = `Error: ${error.message}`;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
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
        document.getElementById('status-message').textContent = `Error: ${error.message}`;
        document.getElementById('start-btn').disabled = false;
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
        document.getElementById('status-message').textContent = `Error: ${error.message}`;
        document.getElementById('stop-btn').disabled = false;
    }
}

// Delete server
async function deleteServer() {
    try {
        const confirmDelete = confirm("Are you sure you want to delete the server?");
        
        if (confirmDelete) {
            document.getElementById('delete-btn').disabled = true;
            document.getElementById('status-message').textContent = 'Deleting server...';
            
            await makeAuthenticatedRequest(config.api.endpoints.delete, 'DELETE'); // Make DELETE request
            
            // Reset UI after deletion
            serverStarted = false; // Reset the flag as the server has been deleted
            updateServerStatus(); // Refresh status after deletion
            alert("Server deleted successfully.");
            
            // Optionally, disable delete button after deletion until next start.
            document.getElementById('delete-btn').disabled = true; 
            
            // You might want to refresh or redirect here depending on your app's flow.
            
       }
       
   } catch (error) {
       document.getElementById('status-message').textContent = `Error: ${error.message}`;
       document.getElementById('delete-btn').disabled = false; 
   }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
         const button = document.querySelector('.input-group .btn');
         const originalText = button.textContent;
         button.textContent = 'Copied!';
         setTimeout(() => {
             button.textContent = originalText;
         }, 2000);
     }).catch(err => console.error('Failed to copy:', err));
}

// Initialize app on load
window.onload = initApp;

// Export global functions
window.login = login;
window.logout = logout;
window.startServer = startServer;
window.stopServer = stopServer;
window.deleteServer = deleteServer; // Export delete function for global access
window.copyToClipboard = copyToClipboard;
