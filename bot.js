require('dotenv').config();
require('dotenv').config({ path: '.env.example' });
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { readFileSync } = require('fs');
const path = require('path');

// Bot index and configuration
const botIndex = parseInt(process.argv[2]) || 0;
const tokens = [
  process.env.BOT_TOKEN_0, process.env.BOT_TOKEN_1, process.env.BOT_TOKEN_2,
  process.env.BOT_TOKEN_3, process.env.BOT_TOKEN_4, process.env.BOT_TOKEN_5,
  process.env.BOT_TOKEN_6, process.env.BOT_TOKEN_7, process.env.BOT_TOKEN_8,
  process.env.BOT_TOKEN_9
];

if (botIndex < 0 || botIndex >= tokens.length) {
  console.error(`Invalid bot index: ${botIndex}`);
  process.exit(1);
}
if (!tokens[botIndex]) {
  console.error(`Bot token not found for index ${botIndex}`);
  process.exit(1);
}

const token = tokens[botIndex];
const audioFile = path.join(__dirname, `new${botIndex + 1}.mp3`);

// Pre-cache audio buffer
let audioBuffer = null;
try {
  audioBuffer = readFileSync(audioFile);
} catch (e) {
  console.warn(`Audio file not found: ${audioFile}`);
}

// Create optimized Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Connection cache
const connections = new Map();
let readyFlag = false;
let commandCooldown = new Map();
const COOLDOWN_MS = 500; // 500ms cooldown per user

// Optimized ready event - runs only once
let activitySet = false;
client.on('ready', () => {
  if (!readyFlag) {
    readyFlag = true;
    console.log(`Bot ${botIndex + 1} (${client.user.tag}) is ready!`);
    if (!activitySet) {
      client.user.setActivity('pk vaa').catch(() => {});
      activitySet = true;
    }
  }
});

// Efficient error handling with recovery
client.on('error', (error) => {
  console.error(`Bot ${botIndex + 1} error:`, error.message);
});

client.on('voiceStateUpdate', () => {
  // Optimized voice state handler
});

// Ultra-fast message handler with debouncing
client.on('messageCreate', async (message) => {
  // Early returns for efficiency
  if (message.author.bot) return;
  if (!message.member) return;

  const userId = message.author.id;
  const guildId = message.guild?.id;
  
  // Rate limiting - prevent spam
  const cooldownKey = `${guildId}-${userId}`;
  const now = Date.now();
  if (commandCooldown.has(cooldownKey)) {
    const expirationTime = commandCooldown.get(cooldownKey) + COOLDOWN_MS;
    if (now < expirationTime) return;
  }
  commandCooldown.set(cooldownKey, now);

  const cmd = message.content;
  const voiceChannel = message.member.voice.channel;
  const connKey = guildId;

  try {
    // Command routing - optimized for speed
    if (cmd === '!join10') {
      if (!voiceChannel) {
        return message.reply('You must be in a voice channel!').catch(() => {});
      }
      if (connections.has(connKey)) {
        return message.reply(`Bot ${botIndex + 1} already in channel!`).catch(() => {});
      }

      // Fast connection
      const conn = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: false
      });

      connections.set(connKey, { conn, player: null });
      console.log(`Bot ${botIndex + 1} joined: ${voiceChannel.name}`);

    } else if (cmd === '!st10') {
      const connection = connections.get(connKey);
      if (!connection) {
        return message.reply(`Bot ${botIndex + 1} not in channel. Use !join10 first!`).catch(() => {});
      }

      // Stop existing player
      if (connection.player) {
        connection.player.stop();
      }

      // Create player with audio buffer
      const player = createAudioPlayer();
      connection.player = player;

      // Fast resource creation from buffer
      let resource;
      try {
        if (audioBuffer) {
          resource = createAudioResource(audioBuffer, { inlineVolume: true });
        } else {
          resource = createAudioResource(audioFile, { inlineVolume: true });
        }
      } catch (e) {
        return message.reply('Audio file error!').catch(() => {});
      }

      // Subscribe and play
      connection.conn.subscribe(player);
      player.play(resource);

      console.log(`Bot ${botIndex + 1} playing audio`);

      // Single listener per player - remove old listeners
      player.removeAllListeners();
      player.once(AudioPlayerStatus.Idle, () => {
        console.log(`Bot ${botIndex + 1} finished`);
      });

      player.on('error', (error) => {
        console.error(`Bot ${botIndex + 1} player error:`, error.message);
      });

    } else if (cmd === '!sp10') {
      const connection = connections.get(connKey);
      if (connection?.player) {
        connection.player.stop();
        console.log(`Bot ${botIndex + 1} stopped`);
      }

    } else if (cmd === '!ds10') {
      const connection = connections.get(connKey);
      if (connection) {
        if (connection.player) connection.player.stop();
        connection.conn.destroy();
        connections.delete(connKey);
        console.log(`Bot ${botIndex + 1} disconnected`);
      }
    }
  } catch (error) {
    console.error(`Bot ${botIndex + 1} error:`, error.message);
    message.reply('Command error!').catch(() => {});
  }
});

// Fast login with timeout
const loginTimeout = setTimeout(() => {
  console.error(`Bot ${botIndex + 1} login timeout!`);
  process.exit(1);
}, 30000); // 30 second timeout

client.login(token).then(() => {
  clearTimeout(loginTimeout);
  console.log(`Bot ${botIndex + 1} connected!`);
}).catch((error) => {
  clearTimeout(loginTimeout);
  console.error(`Bot ${botIndex + 1} login failed:`, error.message);
  process.exit(1);
});

// Optimized graceful shutdown
const shutdown = async () => {
  console.log(`Bot ${botIndex + 1} shutting down...`);
  
  // Cleanup all connections
  for (const [key, conn] of connections.entries()) {
    try {
      if (conn.player) conn.player.stop();
      if (conn.conn) conn.conn.destroy();
    } catch (e) {}
  }
  connections.clear();
  commandCooldown.clear();

  // Disconnect client
  try {
    await client.destroy();
  } catch (e) {}

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`Bot ${botIndex + 1} uncaught exception:`, error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Bot ${botIndex + 1} unhandled rejection:`, reason);
});