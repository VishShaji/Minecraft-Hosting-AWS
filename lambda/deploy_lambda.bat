@echo off
setlocal enabledelayedexpansion

REM Set your AWS profile and region
set AWS_PROFILE=default
set AWS_REGION=ap-south-1

REM Function names
set FUNCTIONS=server_status start_server stop_server

REM Create temporary directory for packaging
mkdir deployment

REM Process each function
for %%f in (%FUNCTIONS%) do (
    echo Processing %%f...
    
    REM Create function directory
    mkdir deployment\%%f
    
    REM Copy function code
    copy %%f.py deployment\%%f\lambda_function.py
    
    REM Create deployment package
    cd deployment\%%f
    powershell Compress-Archive -Path lambda_function.py -DestinationPath ..\%%f.zip -Force
    cd ..\..
    
    REM Update Lambda function
    aws lambda update-function-code --function-name %%f --zip-file fileb://deployment/%%f.zip
    
    echo Updated %%f
)

REM Clean up
rmdir /s /q deployment

echo Deployment complete!
