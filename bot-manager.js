const { Client, GatewayIntentBits, Events } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    entersState,
    StreamType
} = require('@discordjs/voice');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

class BotManager {
    constructor(io) {
        this.io = io;
        this.bots = [];
        this.numBots = 10;
        this.tokens = this.loadTokens();
        this.audioDir = path.join(__dirname, 'uploads');
        this.dataDir = path.join(__dirname, 'data');
        
        if (!fs.existsSync(this.audioDir)) fs.mkdirSync(this.audioDir);
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir);

        this.globalConfig = {
            volume: 100,
            bass: 0,
            speed: 1.0,
            loop: false,
            currentAudio: null,
            currentVC: null,
            eq: 'flat'
        };

        this.loadConfig();
    }

    loadTokens() {
        const tokens = [];
        for (let i = 0; i < this.numBots; i++) {
            const token = process.env[`BOT_TOKEN_${i}`];
            if (token) tokens.push(token.trim());
        }
        return tokens;
    }

    loadConfig() {
        const configPath = path.join(this.dataDir, 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const saved = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.globalConfig = { ...this.globalConfig, ...saved };
            } catch (e) {
                console.error("Error loading config:", e);
            }
        }
    }

    saveConfig() {
        const configPath = path.join(this.dataDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(this.globalConfig, null, 2));
    }

    async init() {
        console.log(`[System] Initializing fleet of ${this.tokens.length} bots...`);
        
        for (let i = 0; i < this.tokens.length; i++) {
            const botId = i;
            const client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildVoiceStates,
                ],
                rest: { retries: 5, timeout: 30000 }
            });

            const player = createAudioPlayer({
                debug: false
            });
            
            const botData = {
                id: botId,
                client,
                player,
                connection: null,
                ffmpeg: null,
                isOnline: false
            };

            this.setupEvents(botData);
            this.bots.push(botData);

            try {
                console.log(`[Bot ${botId}] Attempting Login (30s timeout)...`);
                const loginPromise = client.login(this.tokens[i]);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Login Timeout - Discord is blocking this IP')), 30000)
                );
                
                await Promise.race([loginPromise, timeoutPromise]);
                console.log(`[Bot ${botId}] Login Success!`);
                await new Promise(r => setTimeout(r, 5000)); 
            } catch (err) {
                console.error(`[Bot ${botId}] Login Failed: ${err.message}`);
            }
        }
    }

    setupEvents(bot) {
        bot.client.on('ready', () => {
            bot.isOnline = true;
            bot.tag = bot.client.user.tag;
            console.log(`[Bot ${bot.id}] ONLINE: ${bot.tag}`);
            this.broadcastStatus();
            
            // Rejoin if config has a VC
            if (this.globalConfig.currentVC) {
                this.joinVC(this.globalConfig.currentVC);
            }
            // Auto-play if config has audio
            if (this.globalConfig.currentAudio) {
                this.playAudioOnBot(bot, this.globalConfig.currentAudio);
            }
        });

        bot.player.on('error', (err) => {
            console.error(`[Bot ${bot.id}] Player Error:`, err.message);
        });
    }

    broadcastStatus() {
        const stats = this.bots.map(b => ({
            id: b.id,
            tag: b.client.user?.tag || 'Connecting...',
            isOnline: b.isOnline,
            isJoined: !!b.connection && b.connection.state.status !== VoiceConnectionStatus.Destroyed,
            status: b.player.state.status
        }));

        this.io.emit('botStatus', {
            bots: stats,
            config: this.globalConfig,
            usage: {
                cpu: process.cpuUsage(),
                mem: process.memoryUsage()
            }
        });
    }

    async joinVC(input) {
        const channelId = input.replace(/\D/g, '');
        if (!channelId || channelId.length < 15) {
            console.error(`[System] Invalid Channel ID provided: ${input}`);
            return;
        }

        this.globalConfig.currentVC = channelId;
        this.saveConfig();

        console.log(`[System] Executing Fleet Join for ${this.bots.filter(b => b.isOnline).length} online bots`);

        for (const bot of this.bots) {
            if (!bot.isOnline) continue;

            try {
                const channel = await bot.client.channels.fetch(channelId);
                if (!channel || !channel.isVoiceBased()) {
                    console.error(`[Bot ${bot.id}] Cannot see channel or not a voice channel`);
                    continue;
                }

                if (bot.connection) {
                    try { bot.connection.destroy(); } catch(e) {}
                }

                console.log(`[Bot ${bot.id}] Joining ${channel.name} in ${channel.guild.name}...`);

                bot.connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    selfMute: false,
                    group: bot.client.user.id
                });

                bot.connection.subscribe(bot.player);
                
                bot.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                    try {
                        await Promise.race([
                            entersState(bot.connection, VoiceConnectionStatus.Signalling, 5000),
                            entersState(bot.connection, VoiceConnectionStatus.Connecting, 5000),
                        ]);
                    } catch (error) {
                        if (bot.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                            bot.connection.destroy();
                        }
                        bot.connection = null;
                        this.broadcastStatus();
                    }
                });

                this.broadcastStatus();
                await new Promise(r => setTimeout(r, 4000)); 
            } catch (err) {
                console.error(`[Bot ${bot.id}] Join Error: ${err.message}`);
            }
        }
        console.log(`[System] Fleet Join Sequence Finished.`);
    }

    async disconnectAll() {
        this.globalConfig.currentVC = null;
        this.saveConfig();

        for (const bot of this.bots) {
            if (bot.connection) {
                try {
                    if (bot.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                        bot.connection.destroy();
                    }
                } catch (err) {}
                bot.connection = null;
                bot.player.stop();
            }
            if (bot.ffmpeg) {
                bot.ffmpeg.kill();
                bot.ffmpeg = null;
            }
        }
        console.log(`[System] All bots disconnected.`);
        this.broadcastStatus();
    }

    getFFmpegFilter() {
        const filters = [];
        if (this.globalConfig.bass > 0) {
            filters.push(`bass=g=${this.globalConfig.bass}:f=60:w=0.5`);
        }
        if (this.globalConfig.speed !== 1.0) {
            filters.push(`atempo=${this.globalConfig.speed}`);
        }
        const volMult = this.globalConfig.volume / 100;
        filters.push(`volume=${volMult}`);
        return filters.length > 0 ? filters.join(',') : '';
    }

    playAudioOnBot(bot, audioFileName, startTime = 0) {
        if (!bot.connection || bot.connection.state.status === VoiceConnectionStatus.Destroyed) {
            return;
        }

        const filePath = path.join(this.audioDir, audioFileName);
        if (!fs.existsSync(filePath)) return;

        if (bot.ffmpeg) {
            bot.ffmpeg.kill('SIGKILL');
            bot.ffmpeg = null;
        }
        bot.player.stop(true);

        const filterStr = this.getFFmpegFilter();
        const args = [];
        
        if (startTime > 0) {
            args.push('-ss', startTime.toString());
        }

        args.push(
            '-re',
            '-i', filePath,
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            '-threads', '1',
            'pipe:1'
        );

        if (filterStr) {
            args.splice(args.indexOf(filePath) + 1, 0, '-af', filterStr);
        }

        const ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });
        bot.ffmpeg = ffmpegProcess;
        
        ffmpegProcess.on('error', (err) => {
            console.error(`[Bot ${bot.id}] FFmpeg Error:`, err.message);
        });

        const resource = createAudioResource(ffmpegProcess.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: false
        });

        bot.player.play(resource);
        this.broadcastStatus();
    }

    seek(seconds) {
        if (!this.globalConfig.currentAudio) return;
        if (!this.globalConfig.currentTime) this.globalConfig.currentTime = 0;
        this.globalConfig.currentTime = Math.max(0, this.globalConfig.currentTime + seconds);
        for (const bot of this.bots) {
            this.playAudioOnBot(bot, this.globalConfig.currentAudio, this.globalConfig.currentTime);
        }
    }

    playAll(audioFileName) {
        this.globalConfig.currentAudio = audioFileName;
        this.saveConfig();
        for (const bot of this.bots) {
            this.playAudioOnBot(bot, audioFileName);
        }
    }

    stopAll() {
        this.globalConfig.currentAudio = null;
        for (const bot of this.bots) {
            bot.player.stop();
            if (bot.ffmpeg) {
                bot.ffmpeg.kill();
                bot.ffmpeg = null;
            }
        }
        this.broadcastStatus();
    }

    updateConfig(newConfig) {
        this.globalConfig = { ...this.globalConfig, ...newConfig };
        this.saveConfig();
        if (this.globalConfig.currentAudio) {
            for (const bot of this.bots) {
                this.playAudioOnBot(bot, this.globalConfig.currentAudio);
            }
        } else {
            this.broadcastStatus();
        }
    }
}

module.exports = BotManager;
