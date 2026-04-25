require('dotenv').config();
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
  
  // Keep-alive ping
  setInterval(() => {
    const protocol = appUrl.startsWith('https') ? require('https') : require('http');
    protocol.get(appUrl, (res) => {
      // console.log('Self-ping successful');
    }).on('error', (err) => {
      console.error('Self-ping failed:', err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes
});

// Number of bots
const NUM_BOTS = 10;
const clients = [];

// Start all bots in one process
console.log('Starting Discord Multi-Bot Voice System (Single Process Mode)...');

for (let i = 0; i < NUM_BOTS; i++) {
  const token = process.env[`BOT_TOKEN_${i}`];
  if (!token) {
    console.error(`Token for Bot ${i + 1} (BOT_TOKEN_${i}) missing in Environment!`);
    continue;
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

  let voiceConnection = null;
  let audioPlayer = null;

  client.on('ready', () => {
    console.log(`Bot ${i + 1} (${client.user.tag}) is ready!`);
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Commands: !join10, !st10, !sp10, !ds10
    // Also support generic commands !join, !start, !stop, !leave
    const content = message.content.toLowerCase();

    if (content === '!join10' || content === '!join') {
      const voiceChannel = message.member?.voice.channel;
      if (!voiceChannel) return message.reply('Join a voice channel first!');

      voiceConnection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      message.reply(`Bot ${i + 1} joined!`);
      console.log(`Bot ${i + 1} joined ${voiceChannel.name}`);

    } else if (content === '!st10' || content === '!start') {
      if (!voiceConnection) return message.reply(`Bot ${i + 1} not in VC!`);
      
      if (audioPlayer) audioPlayer.stop();
      audioPlayer = createAudioPlayer();
      const resource = createAudioResource(audioFile);
      voiceConnection.subscribe(audioPlayer);
      audioPlayer.play(resource);
      console.log(`Bot ${i + 1} started playing ${path.basename(audioFile)}`);

    } else if (content === '!sp10' || content === '!stop') {
      if (audioPlayer) {
        audioPlayer.stop();
        message.reply(`Bot ${i + 1} stopped.`);
      }
    } else if (content === '!ds10' || content === '!leave') {
      if (voiceConnection) {
        voiceConnection.destroy();
        voiceConnection = null;
        message.reply(`Bot ${i + 1} left.`);
      }
    }
  });

  client.on('error', (err) => console.error(`Bot ${i + 1} Error:`, err));

  client.login(token).catch(err => console.error(`Bot ${i + 1} Login Failed:`, err));
  clients.push(client);
}

process.on('SIGINT', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});

process.on('SIGTERM', () => {
  clients.forEach(c => c.destroy());
  process.exit(0);
});