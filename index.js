const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const http = require('http');

// 1. Health Check Server (Render requirement)
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Multi-Bot Voice System is Live\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

const NUM_BOTS = 10;
const clients = [];

// Staggered login to avoid Discord rate limits (6 seconds delay)
async function startBot(i) {
  const token = process.env[`BOT_TOKEN_${i}`];
  if (!token) {
    console.error(`[ERROR] Bot ${i + 1}: Token missing in Render Environment!`);
    return;
  }

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

    // Command !join10 or !join
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
    // Command !leave or !ds10
    else if (content === '!leave' || content === '!ds10') {
      const { getVoiceConnection } = require('@discordjs/voice');
      const connection = getVoiceConnection(message.guild.id);
      if (connection) connection.destroy();
    }
  });

  client.on('error', err => console.error(`[ERROR] Bot ${i + 1}:`, err.message));

  try {
    await client.login(token);
    clients.push(client);
  } catch (err) {
    console.error(`[FATAL] Bot ${i + 1} Login Failed:`, err.message);
  }
}

async function run() {
  console.log('--- Starting Multi-Bot Voice System ---');
  for (let i = 0; i < NUM_BOTS; i++) {
    console.log(`[BOOT] Initiating Bot ${i + 1}...`);
    await startBot(i);
    // 6 seconds delay between each bot login
    if (i < NUM_BOTS - 1) {
      console.log('Waiting 6 seconds for next bot...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }
}

run();

// Cleanup
process.on('SIGTERM', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});