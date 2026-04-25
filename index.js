const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const http = require('http');

// Simple health check server
const PORT = process.env.PORT || 8080;
const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Multi-Bot System is running\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

// Number of bots
const NUM_BOTS = 10;
const clients = [];

async function startBot(i) {
  const token = process.env[`BOT_TOKEN_${i}`];
  if (!token) {
    console.error(`[ERROR] Token for Bot ${i + 1} (BOT_TOKEN_${i}) missing!`);
    return;
  }

  console.log(`[DEBUG] Bot ${i + 1} starting login process...`);

  const audioFile = path.join(__dirname, `new${i + 1}.mp3`);
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  client.on('debug', info => {
    // Log important connection info
    if (info.includes('Identify') || info.includes('Connect') || info.includes('Ready') || info.includes('Heartbeat')) {
      console.log(`[JS-DEBUG] Bot ${i + 1}: ${info.substring(0, 100)}`);
    }
  });

  client.on('ready', () => {
    console.log(`[SUCCESS] Bot ${i + 1} (${client.user.tag}) is ready!`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.toLowerCase();

    if (content === '!join10' || content === '!join') {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) return;

      try {
        const voiceConnection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        
        const audioPlayer = createAudioPlayer();
        const resource = createAudioResource(audioFile);
        voiceConnection.subscribe(audioPlayer);
        audioPlayer.play(resource);
        
        console.log(`Bot ${i + 1} playing ${path.basename(audioFile)}`);
      } catch (err) {
        console.error(`Bot ${i + 1} Voice Error:`, err);
      }
    } else if (content === '!ds10' || content === '!leave') {
      const { getVoiceConnection } = require('@discordjs/voice');
      const connection = getVoiceConnection(message.guild.id);
      if (connection) connection.destroy();
    }
  });

  client.on('error', (err) => console.error(`[ERROR] Bot ${i + 1}:`, err.message));

  try {
    await client.login(token);
    clients.push(client);
  } catch (err) {
    console.error(`[FATAL] Bot ${i + 1} Login Failed:`, err.message);
  }
}

async function main() {
  console.log('Starting Discord Multi-Bot Voice System (Asynchronous Mode)...');
  for (let i = 0; i < NUM_BOTS; i++) {
    // Start each bot with a 7 second delay but don't AWAIT the entire login
    // This prevents one bot from blocking the others
    setTimeout(() => startBot(i), i * 7000);
  }
}

main();

process.on('SIGINT', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});

process.on('SIGTERM', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});