# Lambda Functions with Shared Layer

This directory contains Lambda functions for managing a Minecraft server on Google Cloud Platform's Compute Engine.

## Structure

```
lambda/
├── create_layer.bat       # Script to create Lambda layer
├── create_lambda_package.bat  # Script to package Lambda functions
├── requirements.txt       # Python dependencies
├── server_status.py      # Get server status
├── start_server.py       # Start/create server
└── stop_server.py        # Stop server
```

## Setup Instructions

1. Create Lambda Layer:
```bash
# Run the layer creation script
create_layer.bat
```
This creates `lambda_layer.zip` containing all dependencies.

2. Create Lambda Package:
```bash
# Run the Lambda packaging script
create_lambda_package.bat
```
This creates `lambda_package.zip` containing only the Lambda function code.

3. AWS Console Setup:

   a. Create Lambda Layer:
   - Go to AWS Lambda Console
   - Click "Layers" > "Create layer"
   - Upload `lambda_layer.zip`
   - Name: "minecraft-server-dependencies"
   - Compatible runtimes: Python 3.9
   - Architecture: x86_64

   b. Create Lambda Functions:
   - Create three functions: server-status, start-server, stop-server
   - Runtime: Python 3.9
   - Upload `lambda_package.zip` to each function
   - Add the layer to each function
   - Set environment variables:
     ```
     GCP_SERVICE_ACCOUNT_KEY: <base64-encoded-key>
     GCP_PROJECT_ID: <your-project-id>
     GCP_ZONE: <your-zone>
     ```

4. Function Configuration:
   - Memory: 128 MB (sufficient for these operations)
   - Timeout: 30 seconds
   - Execution role: needs permissions for CloudWatch Logs

## Layer Contents

The Lambda layer includes:
- google-cloud-compute
- google-auth

## Function Dependencies

All functions use these shared components from the layer:
- google.cloud.compute_v1
- google.oauth2.service_account
