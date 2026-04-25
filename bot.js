require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const path = require('path');

const botIndex = parseInt(process.argv[2]) || 0;
console.log(`[DEBUG-CHILD] Bot ${botIndex + 1} process started with PID ${process.pid}`);

const token = process.env[`BOT_TOKEN_${botIndex}`];
console.log(`[DEBUG-CHILD] Bot ${botIndex + 1} Token Found: ${token ? 'YES' : 'NO'}`);

if (!token) {
  console.error(`Token missing for bot ${botIndex + 1}`);
  process.exit(1);
}

console.log(`[DEBUG-CHILD] Bot ${botIndex + 1} attempting login...`);


const audioFile = path.join(__dirname, `new${botIndex + 1}.mp3`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Gateway Debug Logs (Unfiltered)
client.on('debug', info => {
  console.log(`[GATEWAY-DEBUG] Bot ${botIndex + 1}: ${info}`);
});

client.on('ready', () => {
  console.log(`[SUCCESS] Bot ${botIndex + 1} (${client.user.tag}) is ready!`);
});

client.on('shardReady', (id) => console.log(`[SHARD] Bot ${botIndex + 1} Shard ${id} Ready!`));
client.on('shardDisconnect', (event, id) => console.log(`[SHARD] Bot ${botIndex + 1} Shard ${id} Disconnected!`));



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

      console.log(`Bot ${botIndex + 1} playing ${path.basename(audioFile)}`);
    } catch (err) {
      console.error(`Bot ${botIndex + 1} error:`, err);
    }
  } else if (content === '!ds10' || content === '!leave') {
    const { getVoiceConnection } = require('@discordjs/voice');
    const connection = getVoiceConnection(message.guild.id);
    if (connection) connection.destroy();
  }
});

console.log(`[DEBUG-CHILD] Bot ${botIndex + 1} waiting ${botIndex * 15} seconds to avoid Discord rate limit...`);

setTimeout(() => {
  console.log(`[DEBUG-CHILD] Bot ${botIndex + 1} calling client.login()...`);
  client.login(token).catch(err => {
    console.error(`[FATAL] Bot ${botIndex + 1} Login Failed:`, err.message);
  });
}, botIndex * 15000);