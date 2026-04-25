const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const path = require('path');
const http = require('http');

// 1. Health Check Server
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Multi-Bot System is Live\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

const NUM_BOTS = 10;
const clients = [];

// Function to start a bot
function startBot(i) {
  const token = process.env[`BOT_TOKEN_${i}`];
  if (!token) return;

  const audioFile = path.join(__dirname, `new${i + 1}.mp3`);
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  client.on('ready', () => {
    console.log(`[READY] Bot ${i + 1} (${client.user.tag}) is online!`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();

    if (content === '!join10' || content === '!join') {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) return;

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(audioFile);
        connection.subscribe(player);
        player.play(resource);

        console.log(`Bot ${i + 1} joined and playing ${path.basename(audioFile)}`);
      } catch (err) {
        console.error(`Bot ${i + 1} Voice Error:`, err);
      }
    } 
    else if (content === '!leave' || content === '!ds10') {
      const { getVoiceConnection } = require('@discordjs/voice');
      const connection = getVoiceConnection(message.guild.id);
      if (connection) connection.destroy();
    }
  });

  client.login(token).catch(err => console.error(`[ERROR] Bot ${i + 1}:`, err.message));
  clients.push(client);
}

// Start ALL bots at once
console.log('--- Starting All Bots Simultaneously ---');
for (let i = 0; i < NUM_BOTS; i++) {
  startBot(i);
}

process.on('SIGTERM', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});