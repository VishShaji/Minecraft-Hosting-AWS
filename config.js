export const config = {
    cognito: {
        UserPoolId: 'ap-south-1_q5k72bACv',
        ClientId: '7q8kiupti9mbmtk42b3o0vlgu',
        Region: 'ap-south-1',
        Domain: 'minecraft', // Cognito domain prefix
        RedirectUri: window.location.origin, // The Amplify URL
        ResponseType: 'token'
    },
    api: {
        baseUrl: 'https://p4lx4rz6ik.execute-api.ap-south-1.amazonaws.com/prod',
        endpoints: {
            status: '/server-status',
            start: '/start-server',
            stop: '/stop-server'
        }
    }
};

export default config;
