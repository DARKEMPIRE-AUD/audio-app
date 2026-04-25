const { fork } = require('child_process');
const path = require('path');
const http = require('http');

// Simple health check server for hosting platforms (Koyeb, Render, etc.)
const PORT = process.env.PORT || 10000;
const appUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
  
  // Keep-alive ping every 10 minutes
  setInterval(() => {
    const protocol = appUrl.startsWith('https') ? require('https') : require('http');
    protocol.get(appUrl, (res) => {
      console.log('Self-ping successful');
    }).on('error', (err) => {
      console.error('Self-ping failed:', err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes
});

// Number of bots
const NUM_BOTS = 10;

// Array to hold child processes
const bots = [];

// Function to start a bot
function startBot(index) {
  console.log(`Starting Bot ${index + 1}...`);

  const botProcess = fork(path.join(__dirname, 'bot.js'), [index.toString()], {
    stdio: 'inherit', // Inherit stdout/stderr for logging
    env: { ...process.env, BOT_INDEX: index }
  });

  botProcess.on('exit', (code, signal) => {
    console.log(`Bot ${index + 1} exited with code ${code} and signal ${signal}`);
    // Optionally restart the bot
    if (code !== 0) {
      console.log(`Restarting Bot ${index + 1} in 5 seconds...`);
      setTimeout(() => startBot(index), 5000);
    }
  });

  botProcess.on('error', (error) => {
    console.error(`Bot ${index + 1} error:`, error);
  });

  bots[index] = botProcess;
}

// Start all bots
console.log('Starting Discord Multi-Bot Voice System...');
for (let i = 0; i < NUM_BOTS; i++) {
  startBot(i);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down all bots...');
  bots.forEach((bot, index) => {
    if (bot && !bot.killed) {
      console.log(`Terminating Bot ${index + 1}...`);
      bot.kill('SIGINT');
    }
  });

  // Wait a bit for bots to shut down
  setTimeout(() => {
    console.log('All bots shut down. Exiting...');
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down all bots...');
  bots.forEach((bot, index) => {
    if (bot && !bot.killed) {
      console.log(`Terminating Bot ${index + 1}...`);
      bot.kill('SIGTERM');
    }
  });

  setTimeout(() => {
    console.log('All bots shut down. Exiting...');
    process.exit(0);
  }, 2000);
});

// Optional: Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log(`All ${NUM_BOTS} bots started. Press Ctrl+C to stop.`);