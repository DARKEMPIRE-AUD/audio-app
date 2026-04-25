# Discord Multi-Bot Voice System

A production-ready Discord bot system that runs 10 separate bot processes, each capable of joining voice channels and playing synchronized audio.

## Features

- **10 Independent Bots**: Each bot runs in its own process with separate Discord tokens
- **Voice Channel Management**: Bots can join, play audio, stop, and disconnect from voice channels
- **Synchronized Commands**: All bots respond to global commands simultaneously
- **Process Separation**: Uses PM2 for reliable process management (no cluster mode)
- **Error Handling**: Comprehensive error handling for tokens, connections, and audio playback
- **Rate Limit Safe**: Designed to avoid Discord API rate limits

## Requirements

- Node.js 16.x or higher
- FFmpeg (automatically installed via ffmpeg-static)
- 10 valid Discord bot tokens
- Audio files: `new1.mp3` through `new10.mp3`

## Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Place your audio files (`new1.mp3` to `new10.mp3`) in the project root directory

4. Update the bot tokens in `bot.js` (replace the placeholder tokens with your actual bot tokens)

## Usage

### Starting the Bots

You have two options to start the bots:

#### Option 1: Using PM2 (Recommended for Production)
```bash
npm start
```
This starts all 10 bots as separate PM2 processes with monitoring and auto-restart.

#### Option 2: Using Node.js Directly
```bash
npm run start:node
# or
node index.js
```
This starts all bots as child processes managed by the main Node.js process.

### Stopping the Bots

For PM2:
```bash
npm stop
```

For Node.js: Press `Ctrl+C` in the terminal where it's running.

### Restarting the Bots

```bash
npm restart
```

### Viewing Logs

```bash
npm run logs
```

### Deleting PM2 Processes

```bash
npm run delete
```

## Discord Commands

All commands must be sent in a text channel where the bots have access:

- `pk vaa` - All bots join your current voice channel
- `pk vaa st` - All bots start playing their assigned audio file simultaneously
- `pk vaa sp` - All bots stop audio playback
- `pk vaa ds` - All bots disconnect from voice channels

## Architecture

- **Separate Processes**: Each of the 10 bots runs in its own Node.js process
- **Two Startup Options**:
  - **PM2**: Production-ready process manager with monitoring and auto-restart
  - **Node.js Direct**: Master process spawns child processes using `child_process.fork()`
- **No Shared State**: Bots operate independently, avoiding conflicts
- **Voice Isolation**: Each bot maintains its own voice connection
- **Command Synchronization**: Bots respond to commands independently but simultaneously

## File Structure

```
├── bot.js                 # Main bot script (runs 10 instances)
├── ecosystem.config.js    # PM2 configuration for 10 processes
├── package.json           # Dependencies and scripts
├── new1.mp3              # Audio file for bot 1
├── new2.mp3              # Audio file for bot 2
├── ...
└── new10.mp3             # Audio file for bot 10
```

## Error Handling

The system includes comprehensive error handling for:

- Invalid or expired bot tokens
- Voice channel connection failures
- Audio file playback errors
- Network issues
- Graceful shutdown on process termination

## Troubleshooting

### Bots Not Starting
- Check that all tokens are valid and not expired
- Ensure bots are invited to your Discord server with proper permissions
- Check PM2 logs: `npm run logs`

### Audio Not Playing
- Verify audio files exist and are in the correct format (MP3)
- Check FFmpeg installation
- Ensure bots have voice channel permissions

### Commands Not Working
- Make sure you're in a voice channel for `!join10`
- Check bot permissions in the text channel
- Verify bots are online and connected

### Rate Limits
- The system includes delays and proper spacing to avoid rate limits
- If issues persist, increase delays in the code

## Security Notes

- Never commit real bot tokens to version control
- Use environment variables for tokens in production
- Keep audio files appropriately licensed

## License

ISC