# Minecraft Server Manager

A web application that allows users to manage a Minecraft server running on Google Cloud Platform's Compute Engine using AWS Cognito for authentication.

## Setup Instructions

### Prerequisites
1. AWS Account
2. Google Cloud Platform Account
3. GCP Service Account with Compute Engine permissions
4. AWS Cognito User Pool

### AWS Setup

1. Create a Cognito User Pool:
   - Go to AWS Cognito Console
   - Create a new User Pool
   - Configure sign-in options (email/password)
   - Create an app client
   - Note down the User Pool ID and Client ID

2. Create Lambda Functions:
   - Create three Lambda functions: start_server, stop_server, and server_status
   - Upload the Python files from the `lambda` directory
   - Install dependencies using requirements.txt
   - Set environment variables:
     - GCP_SERVICE_ACCOUNT_KEY (base64 encoded)
     - GCP_PROJECT_ID
     - GCP_ZONE

3. Create API Gateway:
   - Create a new REST API
   - Create three endpoints:
     - POST /start-server
     - POST /stop-server
     - GET /server-status
   - Configure Cognito authorizer
   - Deploy the API

### Frontend Setup

1. Update config.js:
   ```javascript
   const config = {
       cognito: {
           UserPoolId: 'YOUR_USER_POOL_ID',
           ClientId: 'YOUR_CLIENT_ID',
           Region: 'YOUR_REGION'
       },
       api: {
           baseUrl: 'YOUR_API_GATEWAY_URL'
       }
   };
   ```

2. Host the frontend files:
   - index.html
   - app.js
   - config.js

## Usage

1. Open the web application in a browser
2. Sign in using your Cognito user credentials
3. Use the interface to:
   - Start the Minecraft server
   - Stop the server
   - Check server status

## Security Considerations

- The application uses AWS Cognito for secure authentication
- API Gateway endpoints are protected with Cognito authorizers
- GCP service account key is stored securely in Lambda environment variables
- Server runs on a preemptible instance for cost optimization

## Architecture

- Frontend: HTML, JavaScript, Bootstrap
- Authentication: AWS Cognito
- Backend: AWS Lambda
- API: AWS API Gateway
- Compute: Google Cloud Compute Engine (Preemptible Instance)

## Monitoring

The application automatically checks server status every 30 seconds when a user is logged in.

## Cost Optimization

The server runs on a preemptible instance to reduce costs. Note that preemptible instances may be terminated by GCP with short notice.
