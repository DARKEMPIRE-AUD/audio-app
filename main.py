import discord
from discord.ext import commands
import asyncio
import os
import threading
from flask import Flask
from dotenv import load_dotenv
import logging
import time

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

# ─── Flask health-check server ───────────────────────────────────────────────
app = Flask(__name__)

LOG_FILE = "bot.log"

def log(msg):
    """Write to log file and stdout."""
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")
    print(msg, flush=True)

@app.route('/')
def home():
    try:
        with open(LOG_FILE, "r") as f:
            return f"<pre>{f.read()}</pre>"
    except Exception:
        return "Log file not created yet."

def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

# Start Flask in background
threading.Thread(target=run_flask, daemon=True).start()

# ─── Parse tokens ────────────────────────────────────────────────────────────
def get_tokens():
    """Parse TOKENS env var (comma-separated) into a list."""
    raw = os.environ.get("TOKENS", "")
    if not raw:
        log("ERROR: TOKENS environment variable is missing or empty!")
        return []
    tokens = [t.strip() for t in raw.split(",") if t.strip()]
    log(f"Found {len(tokens)} tokens")
    return tokens

# ─── Bot class ────────────────────────────────────────────────────────────────
class MultiBot(commands.Bot):
    def __init__(self, bot_index, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bot_index = bot_index
        self.audio_file = f"new{bot_index + 1}.mp3"
        self.voice_client = None

    async def on_ready(self):
        log(f"Bot {self.bot_index + 1} ({self.user}) is ready!")
        await self.change_presence(activity=discord.Game(name="pk vaa"))

    async def on_message(self, message):
        if message.author.bot:
            return

        content = message.content.lower().strip()

        # ── !join10 ──
        if content == "!join10":
            if not message.author.voice:
                await message.channel.send(f"Bot {self.bot_index + 1}: You need to be in a voice channel!")
                return

            channel = message.author.voice.channel

            # Stagger joins (2s per bot) to avoid Discord voice timeout
            if self.bot_index > 0:
                await asyncio.sleep(self.bot_index * 2)

            try:
                self.voice_client = await channel.connect(timeout=30.0)
                log(f"Bot {self.bot_index + 1} joined {channel.name}")
            except Exception as e:
                log(f"Bot {self.bot_index + 1} failed to join voice: {e}")

        # ── !st10 ──
        elif content == "!st10":
            if not self.voice_client or not self.voice_client.is_connected():
                return

            if not os.path.exists(self.audio_file):
                log(f"Bot {self.bot_index + 1}: File {self.audio_file} not found")
                return

            if self.voice_client.is_playing():
                self.voice_client.stop()

            # Stagger playback (1s per bot)
            if self.bot_index > 0:
                await asyncio.sleep(self.bot_index * 1)

            try:
                source = discord.FFmpegPCMAudio(self.audio_file)
                self.voice_client.play(source)
                log(f"Bot {self.bot_index + 1} playing {self.audio_file}")
            except Exception as e:
                log(f"Bot {self.bot_index + 1} failed to play: {e}")

        # ── !sp10 ──
        elif content == "!sp10":
            if self.voice_client and self.voice_client.is_playing():
                self.voice_client.stop()
                log(f"Bot {self.bot_index + 1} stopped playback")

        # ── !ds10 ──
        elif content == "!ds10":
            if self.voice_client and self.voice_client.is_connected():
                await self.voice_client.disconnect()
                self.voice_client = None
                log(f"Bot {self.bot_index + 1} disconnected")

# ─── Startup ──────────────────────────────────────────────────────────────────
async def start_bots():
    tokens = get_tokens()
    if not tokens:
        log("No tokens found. Cannot start any bots.")
        return

    intents = discord.Intents.default()
    intents.message_content = True
    intents.voice_states = True

    tasks = []
    for i, token in enumerate(tokens):
        bot = MultiBot(bot_index=i, command_prefix="!", intents=intents)

        async def run_bot(b, t, index):
            # Stagger logins: 20s between each bot
            if index > 0:
                wait = index * 20
                log(f"Bot {index + 1} waiting {wait}s before login...")
                await asyncio.sleep(wait)
            try:
                log(f"Bot {index + 1} logging in...")
                # discord.py handles 429 rate limits internally
                await b.start(t)
            except discord.LoginFailure:
                log(f"Bot {index + 1} INVALID TOKEN - check your TOKENS env var!")
            except Exception as e:
                log(f"Bot {index + 1} error: {e}")

        tasks.append(run_bot(bot, token, i))
        log(f"Queued Bot {i + 1}")

    log(f"Starting {len(tasks)} bots (staggered 20s apart)...")
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        with open(LOG_FILE, "w") as f:
            f.write("--- Starting application ---\n")
        log("Starting application...")
        asyncio.run(start_bots())
    except KeyboardInterrupt:
        log("Shutting down...")
    except Exception as e:
        log(f"Fatal error: {e}")
    finally:
        log("Application stopped. Keeping alive for logs...")
        while True:
            time.sleep(1)
