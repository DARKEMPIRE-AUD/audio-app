const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// Simple health check server
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bots are active\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

const NUM_BOTS = 10;

async function startBot(i) {
  const token = process.env[`BOT_TOKEN_${i}`];
  if (!token) return;

  console.log(`[STARTING] Bot ${i + 1}...`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.on('ready', () => {
    console.log(`[ONLINE] Bot ${i + 1} is READY! (${client.user.tag})`);
  });

  client.on('error', err => console.error(`[ERROR] Bot ${i + 1}:`, err.message));

  try {
    await client.login(token);
  } catch (err) {
    console.error(`[FAILED] Bot ${i + 1}:`, err.message);
  }
}

console.log('--- Multi-Bot System (Test Mode) ---');
for (let i = 0; i < NUM_BOTS; i++) {
  setTimeout(() => startBot(i), i * 5000);
}