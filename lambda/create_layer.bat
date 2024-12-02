@echo off
REM Create a temporary directory for the layer
mkdir python
cd python

REM Install required packages
pip install --target . google-cloud-compute==1.22.0
pip install --target . google-auth==2.22.0

REM Create the layer ZIP file
cd ..
powershell Compress-Archive -Path python -DestinationPath lambda_layer.zip -Force

REM Clean up
rmdir /s /q python

echo Layer creation complete. Upload lambda_layer.zip to AWS Lambda as a layer.
