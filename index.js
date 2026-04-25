const { fork } = require('child_process');
const path = require('path');
const http = require('http');

// Simple health check server
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running\n');
}).listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`);
});

const NUM_BOTS = 10;
const bots = [];

function startBot(index) {
  console.log(`Starting Bot ${index + 1}...`);

  const botProcess = fork(path.join(__dirname, 'bot.js'), [index.toString()], {
    stdio: 'inherit',
    env: { ...process.env, BOT_INDEX: index }
  });

  botProcess.on('exit', (code, signal) => {
    console.log(`Bot ${index + 1} exited. Code: ${code}`);
    if (code !== 0) {
      setTimeout(() => startBot(index), 5000);
    }
  });

  bots[index] = botProcess;
}

console.log('Starting Discord Multi-Bot Voice System (Original Multi-Process Mode)...');
for (let i = 0; i < NUM_BOTS; i++) {
  startBot(i);
}