@echo off
echo Packaging files for AWS Amplify...

REM Create a temporary directory for packaging
mkdir amplify_package

REM Copy required files
copy index.html amplify_package\
copy app.js amplify_package\
copy config.js amplify_package\
copy amplify.yml amplify_package\
if exist style.css copy style.css amplify_package\

REM Create ZIP file
powershell Compress-Archive -Path amplify_package\* -DestinationPath amplify_deploy.zip -Force

REM Clean up
rmdir /s /q amplify_package

echo Package created as amplify_deploy.zip
echo Upload this file to AWS Amplify Console
