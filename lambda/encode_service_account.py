import base64
import json

# Read the service account key file
key_path = str(input('Enter the path to the service account key file: '))
with open(key_path, 'r') as f:
    key_content = f.read()

# Encode to base64
encoded_key = base64.b64encode(key_content.encode('utf-8')).decode('utf-8')

# Save to a file
with open('encoded_key.txt', 'w') as f:
    f.write(encoded_key)

print("Service account key has been encoded and saved to 'encoded_key.txt'")
