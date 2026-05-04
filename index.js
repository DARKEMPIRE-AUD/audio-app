require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const path = require('path');

let tokens = (process.env.TOKENS || '').split(',').map(t => t.trim()).filter(Boolean);

if (tokens.length === 0) {
    // Try to load from BOT_TOKEN_0, BOT_TOKEN_1, etc.
    for (let i = 0; i < 10; i++) {
        const token = process.env[`BOT_TOKEN_${i}`];
        if (token) tokens.push(token.trim());
    }
}

if (tokens.length === 0) {
    console.error("No tokens found in environment variables");
    process.exit(1);
}

const bots = [];

// Helper function for delays
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function startBots() {
    console.log(`Initializing ${tokens.length} bots. Using staggered login...`);

    for (let i = 0; i < tokens.length; i++) {
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });

        const botData = {
            id: i + 1,
            client,
            player,
            connection: null,
            audioFile: path.join(__dirname, `new${i + 1}.mp3`)
        };
        bots.push(botData);

        client.once('ready', () => {
            console.log(`[Bot ${botData.id}] Ready! Logged in as ${client.user.tag}`);
        });

        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            // Only the FIRST bot listens to commands so we don't trigger the same command 10 times
            if (botData.id !== 1) return;

            const command = message.content.trim().toLowerCase();

            if (command === '!join10') {
                const voiceChannel = message.member?.voice?.channel;
                if (!voiceChannel) {
                    return message.reply('You need to be in a voice channel first!');
                }

                message.reply(`Bots are joining <#${voiceChannel.id}> slowly to prevent rate limits...`);
                
                for (const bot of bots) {
                    try {
                        bot.connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: voiceChannel.guild.id,
                            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                            selfDeaf: true,
                            selfMute: false
                        });

                        bot.connection.subscribe(bot.player);
                        console.log(`[Bot ${bot.id}] Joined voice channel.`);
                    } catch (error) {
                        console.error(`[Bot ${bot.id}] Failed to join:`, error);
                    }
                    
                    // Staggered join (2 second delay)
                    await sleep(2000);
                }
                
                message.channel.send('✅ All bots joined successfully!');
            }

            if (command === '!st10') {
                message.reply('Starting synchronized playback in 2 seconds...');
                
                // Target time is exactly 2 seconds in the future
                const targetTime = Date.now() + 2000;
                
                for (const bot of bots) {
                    // How long this specific bot needs to wait to hit the target time
                    const timeToWait = targetTime - Date.now();
                    
                    // Pre-create the audio resource so there's no disk I/O delay inside the timeout
                    try {
                        const resource = createAudioResource(bot.audioFile);
                        
                        setTimeout(() => {
                            bot.player.play(resource);
                            console.log(`[Bot ${bot.id}] Started playing synchronized audio.`);
                        }, Math.max(0, timeToWait));
                    } catch (err) {
                        console.error(`[Bot ${bot.id}] Error reading audio file:`, err);
                    }
                }
            }

            if (command === '!sp10') {
                for (const bot of bots) {
                    bot.player.stop();
                }
                message.reply('⏹️ Stopped all audio.');
            }

            if (command === '!ds10') {
                for (const bot of bots) {
                    if (bot.connection) {
                        bot.connection.destroy();
                        bot.connection = null;
                    }
                }
                message.reply('🔌 All bots disconnected.');
            }
        });

        // Staggered login (3 second delay between each token login)
        try {
            await client.login(tokens[i]);
            // Wait 3 seconds before logging in the next bot to avoid global rate limits
            if (i < tokens.length - 1) {
                await sleep(3000);
            }
        } catch (error) {
            console.error(`[Bot ${i + 1}] Login failed:`, error);
        }
    }
    
    console.log("All bots initialized successfully!");
}

startBots();