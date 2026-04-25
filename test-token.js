const http = require('https');

const token = process.env.BOT_TOKEN_0;

if (!token) {
    console.error("TOKEN MISSING IN ENVIRONMENT!");
    process.exit(1);
}

console.log("Checking Token Validity via Direct Discord API Request...");

const options = {
    hostname: 'discord.com',
    port: 443,
    path: '/api/v10/users/@me',
    method: 'GET',
    headers: {
        'Authorization': `Bot ${token}`
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            const user = JSON.parse(data);
            console.log(`[SUCCESS] Token is VALID! Bot Name: ${user.username}#${user.discriminator}`);
        } else if (res.statusCode === 401) {
            console.error("[FAILED] Token is INVALID or Unauthorized!");
        } else {
            console.error(`[FAILED] Discord API returned error: ${data}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`[ERROR] Connection failed: ${e.message}`);
});

req.end();
