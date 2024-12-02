import json
import os
from google.oauth2 import service_account
from google.cloud import compute_v1
import base64

def get_credentials():
    service_account_key = base64.b64decode(os.environ['GCP_SERVICE_ACCOUNT_KEY'])
    credentials = service_account.Credentials.from_service_account_info(
        json.loads(service_account_key)
    )
    return credentials

def get_startup_script():
    return '''#!/bin/bash
# Install Java
apt-get update
apt-get install -y wget
wget https://cdn.azul.com/zulu/bin/zulu21.28.85-ca-jdk21.0.0-linux_amd64.deb
apt-get install -y ./zulu21.28.85-ca-jdk21.0.0-linux_amd64.deb
rm zulu21.28.85-ca-jdk21.0.0-linux_amd64.deb

# Create minecraft directory
mkdir -p /minecraft
cd /minecraft

# Download server jar
wget https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar

# Create and configure server properties
echo "eula=true" > eula.txt
echo "server-port=25565" > server.properties
echo "max-memory=1024M" >> server.properties
echo "difficulty=normal" >> server.properties
echo "gamemode=survival" >> server.properties
echo "level-name=world" >> server.properties
echo "motd=Minecraft Server" >> server.properties
echo "spawn-protection=16" >> server.properties
echo "view-distance=10" >> server.properties

# Create startup script
echo "#!/bin/bash" > start.sh
echo "cd /minecraft" >> start.sh
echo "java -Xmx1024M -Xms1024M -jar server.jar nogui" >> start.sh
chmod +x start.sh

# Run server
./start.sh'''

def lambda_handler(event, context):
    try:
        # API Gateway proxy integration requires checking authorization in the event
        if not event.get('requestContext', {}).get('authorizer', {}).get('claims'):
            return {
                'statusCode': 401,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({'error': 'Unauthorized'})
            }

        # Handle OPTIONS request for CORS
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({})
            }

        credentials = get_credentials()
        instance_client = compute_v1.InstancesClient(credentials=credentials)
        
        project_id = os.environ['GCP_PROJECT_ID']
        zone = os.environ['GCP_ZONE']
        instance_name = 'minecraft-server'
        
        try:
            # Check if instance exists
            instance = instance_client.get(
                project=project_id,
                zone=zone,
                instance=instance_name
            )
            
            # If instance exists but is not running, start it
            if instance.status != 'RUNNING':
                operation = instance_client.start(
                    project=project_id,
                    zone=zone,
                    instance=instance_name
                )
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({'message': 'Server is starting'})
                }
            else:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({'message': 'Server is already running'})
                }
                
        except Exception:
            # Instance doesn't exist, create it
            instance_config = {
                'name': instance_name,
                'machine_type': f'zones/{zone}/machineTypes/e2-medium',
                'disks': [{
                    'boot': True,
                    'auto_delete': True,
                    'initialize_params': {
                        'source_image': 'projects/debian-cloud/global/images/debian-11-bullseye-v20230912',
                        'disk_size_gb': 20
                    }
                }],
                'network_interfaces': [{
                    'network': 'global/networks/default',
                    'access_configs': [{'name': 'External NAT'}]
                }],
                'metadata': {
                    'items': [{
                        'key': 'startup-script',
                        'value': get_startup_script()
                    }]
                },
                'scheduling': {
                    'preemptible': True,
                    'automaticRestart': False,
                    'onHostMaintenance': 'TERMINATE'
                }
            }
            
            operation = instance_client.insert(
                project=project_id,
                zone=zone,
                instance_resource=instance_config
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'message': 'Server is being created and started'})
            }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }
