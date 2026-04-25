require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const path = require('path');

const botIndex = parseInt(process.argv[2]) || 0;
const token = process.env[`BOT_TOKEN_${botIndex}`];

if (!token) {
  console.error(`Token missing for bot ${botIndex + 1}`);
  process.exit(1);
}

const audioFile = path.join(__dirname, `new${botIndex + 1}.mp3`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.on('ready', () => {
  console.log(`Bot ${botIndex + 1} (${client.user.tag}) is ready!`);
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

client.login(token);