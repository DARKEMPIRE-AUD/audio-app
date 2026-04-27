const { fork } = require('child_process');
const path = require('path');
const http = require('http');
require('dotenv').config();
require('dotenv').config({ path: '.env.example' });

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

// Check if tokens are set
console.log('Validating environment variables...');
const missingTokens = [];
for (let i = 0; i < NUM_BOTS; i++) {
  if (!process.env[`BOT_TOKEN_${i}`]) {
    missingTokens.push(`BOT_TOKEN_${i}`);
  }
}

if (missingTokens.length > 0) {
  console.warn(`\n[WARNING] The following environment variables are missing: ${missingTokens.join(', ')}`);
  console.warn('The bots associated with these tokens will not be able to start.\n');
} else {
  console.log('[SUCCESS] All 10 bot tokens are present in environment.\n');
}

// Array to hold child processes
const bots = [];

// Optimized bot spawning with better resource management
function startBot(index) {
  console.log(`[${index + 1}/10] Starting Bot ${index + 1}...`);

  const botProcess = fork(path.join(__dirname, 'bot.js'), [index.toString()], {
    stdio: 'inherit',
    env: { ...process.env, BOT_INDEX: index },
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    detached: false,
    windowsHide: true
  });

  botProcess.on('exit', (code, signal) => {
    console.warn(`Bot ${index + 1} exited with code ${code}, signal ${signal}`);
    // Auto-restart with exponential backoff
    if (code !== 0 && code !== null) {
      console.log(`Restarting Bot ${index + 1} in 3 seconds...`);
      setTimeout(() => startBot(index), 3000);
    }
  });

  botProcess.on('error', (error) => {
    console.error(`Bot ${index + 1} process error:`, error.message);
  });

  bots[index] = botProcess;
}

// Start all bots with staggered delays to prevent resource contention
console.log('Starting Discord Multi-Bot Voice System...');
let startedCount = 0;
for (let i = 0; i < NUM_BOTS; i++) {
  setTimeout(() => {
    startBot(i);
  }, i * 500); // 500ms delay between each bot startup
}

// Track startup completion
setTimeout(() => {
  console.log(`[SUCCESS] All 10 bots started. Press Ctrl+C to stop.`);
}, NUM_BOTS * 500 + 5000);

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