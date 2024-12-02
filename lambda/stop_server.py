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
            instance = instance_client.get(
                project=project_id,
                zone=zone,
                instance=instance_name
            )
            
            if instance.status == 'RUNNING':
                operation = instance_client.stop(
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
                    'body': json.dumps({'message': 'Server is stopping'})
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
                    'body': json.dumps({'message': f'Server is already in {instance.status} state'})
                }
                
        except Exception:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'message': 'Server not found'})
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
