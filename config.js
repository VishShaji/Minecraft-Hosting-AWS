export const config = {
    cognito: {
        UserPoolId: 'ap-south-1_pHPaoBEVN',
        ClientId: '4iffruad2h6bdvl3rv2aeofpl0',
        Region: 'ap-south-1',
        Domain: 'minecraft-server-manager', // Just the domain prefix
        RedirectUri: 'https://frontend.daeohx4b9wc45.amplifyapp.com', // Amplify URL without trailing slash
        ResponseType: 'token'  // Request both token types
    },
    api: {
        baseUrl: 'https://p4lx4rz6ik.execute-api.ap-south-1.amazonaws.com/prod',
        endpoints: {
            status: '/server-status',
            start: '/start-server',
            stop: '/stop-server',
            delete: '/delete-server'
        }
    }
};

export default config;
