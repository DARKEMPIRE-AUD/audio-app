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
        
        // THE MASTER ENGINE: One player for the whole fleet
        this.masterPlayer = createAudioPlayer();
        this.centralFFmpeg = null;

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
        this.setupMasterEvents();
    }

    setupMasterEvents() {
        this.masterPlayer.on('error', (err) => {
            console.error(`[Master Player] Error:`, err.message);
        });
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
                intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
                makeCache: () => new Map(), 
                rest: { retries: 5, timeout: 30000 }
            });
            const botData = { id: botId, client, connection: null, isOnline: false };
            this.setupEvents(botData);
            this.bots.push(botData);
            try {
                const loginPromise = client.login(this.tokens[i]);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000));
                await Promise.race([loginPromise, timeoutPromise]);
                console.log(`[Bot ${botId}] ONLINE`);
                await new Promise(r => setTimeout(r, 4000)); 
            } catch (err) {
                console.error(`[Bot ${botId}] Login Failed`);
            }
        }
    }

    setupEvents(bot) {
        bot.client.on('ready', () => {
            bot.isOnline = true;
            this.broadcastStatus();
        });
    }

    broadcastStatus() {
        const stats = this.bots.map(b => ({
            id: b.id,
            tag: b.client.user?.tag || 'Connecting...',
            isOnline: b.isOnline,
            isJoined: !!b.connection && b.connection.state.status !== VoiceConnectionStatus.Destroyed,
            status: this.masterPlayer.state.status
        }));
        this.io.emit('botStatus', { bots: stats, config: this.globalConfig });
    }

    async joinVC(input) {
        const channelId = input.replace(/\D/g, '');
        this.globalConfig.currentVC = channelId;
        this.saveConfig();
        for (const bot of this.bots) {
            if (!bot.isOnline) continue;
            try {
                const channel = await bot.client.channels.fetch(channelId);
                if (bot.connection) bot.connection.destroy();
                bot.connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true,
                    group: bot.client.user.id
                });
                
                // ALL bots subscribe to the SAME Master Player
                bot.connection.subscribe(this.masterPlayer);
                
                this.broadcastStatus();
                await new Promise(r => setTimeout(r, 2000)); 
            } catch (err) {}
        }
    }

    async disconnectAll() {
        this.globalConfig.currentVC = null;
        this.saveConfig();
        this.stopAll();
        for (const bot of this.bots) {
            if (bot.connection) bot.connection.destroy();
            bot.connection = null;
        }
        this.broadcastStatus();
    }

    getFFmpegFilter() {
        const filters = [];
        if (this.globalConfig.bass > 0) filters.push(`bass=g=${this.globalConfig.bass}:f=60:w=0.5`);
        if (this.globalConfig.speed !== 1.0) filters.push(`atempo=${this.globalConfig.speed}`);
        filters.push(`volume=${this.globalConfig.volume / 100}`);
        return filters.length > 0 ? filters.join(',') : '';
    }

    playAll(audioFileName, startTime = 0) {
        const filePath = path.join(this.audioDir, audioFileName);
        if (!fs.existsSync(filePath)) return;

        this.globalConfig.currentAudio = audioFileName;
        this.saveConfig();

        if (this.centralFFmpeg) {
            this.centralFFmpeg.kill('SIGKILL');
            this.centralFFmpeg = null;
        }
        this.masterPlayer.stop(true);

        const filterStr = this.getFFmpegFilter();
        const args = ['-re'];
        if (startTime > 0) args.push('-ss', startTime.toString());
        
        args.push(
            '-i', filePath,
            '-c:a', 'libopus',
            '-b:a', '48k', // Better quality than 32k since we only have ONE stream now
            '-vbr', 'on',
            '-ar', '48000',
            '-ac', '2',
            '-f', 'opus',
            'pipe:1'
        );
        
        if (filterStr) args.splice(args.indexOf(filePath) + 1, 0, '-af', filterStr);

        this.centralFFmpeg = spawn('ffmpeg', args);
        
        // Just play the one stream on the one player!
        const resource = createAudioResource(this.centralFFmpeg.stdout, { 
            inputType: StreamType.OggOpus 
        });
        
        this.masterPlayer.play(resource);

        console.log(`[System] Master Player started: ${audioFileName}`);
        this.broadcastStatus();
    }

    playAudioOnBot(bot, audioFileName) {
        // Automatically handled by subscription to masterPlayer
    }

    stopAll() {
        this.globalConfig.currentAudio = null;
        if (this.centralFFmpeg) {
            this.centralFFmpeg.kill();
            this.centralFFmpeg = null;
        }
        this.masterPlayer.stop();
        this.broadcastStatus();
    }

    seek(seconds) {
        if (!this.globalConfig.currentAudio) return;
        this.globalConfig.currentTime = Math.max(0, (this.globalConfig.currentTime || 0) + seconds);
        this.playAll(this.globalConfig.currentAudio, this.globalConfig.currentTime);
    }

    updateConfig(newConfig) {
        this.globalConfig = { ...this.globalConfig, ...newConfig };
        this.saveConfig();
        if (this.globalConfig.currentAudio) this.playAll(this.globalConfig.currentAudio);
        else this.broadcastStatus();
    }
}

module.exports = BotManager;
