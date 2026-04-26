import discord
from discord.ext import commands
import asyncio
import os
import threading
from flask import Flask
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

app = Flask(__name__)

LOG_FILE = "bot.log"

def log_to_file(msg):
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")
    print(msg, flush=True)

@app.route('/')
def home():
    try:
        with open(LOG_FILE, "r") as f:
            content = f.read()
        return f"<pre>{content}</pre>"
    except:
        return "Log file not created yet."

def run_flask():
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)

# Start Flask in a separate thread
threading.Thread(target=run_flask, daemon=True).start()

# Bot settings
NUM_BOTS = 10
bots = []

class MultiBot(commands.Bot):
    def __init__(self, bot_index, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.bot_index = bot_index
        self.audio_file = f"new{bot_index + 1}.mp3"
        self.voice_client = None

    async def on_ready(self):
        log_to_file(f"Bot {self.bot_index + 1} ({self.user}) is ready!")
        await self.change_presence(activity=discord.Game(name="pk vaa"))

    async def on_message(self, message):
        if message.author.bot:
            return
        
        # All bots listen to the same commands
        content = message.content.lower()
        
        if content == "!join10":
            if message.author.voice:
                channel = message.author.voice.channel
                self.voice_client = await channel.connect()
                log_to_file(f"Bot {self.bot_index + 1} joined {channel.name}")
            else:
                await message.channel.send(f"Bot {self.bot_index + 1}: You need to be in a voice channel!")

        elif content == "!st10":
            if self.voice_client and self.voice_client.is_connected():
                if os.path.exists(self.audio_file):
                    if self.voice_client.is_playing():
                        self.voice_client.stop()
                    
                    source = discord.FFmpegPCMAudio(self.audio_file)
                    self.voice_client.play(source)
                    log_to_file(f"Bot {self.bot_index + 1} playing {self.audio_file}")
                else:
                    log_to_file(f"Bot {self.bot_index + 1}: File {self.audio_file} not found")

        elif content == "!sp10":
            if self.voice_client and self.voice_client.is_playing():
                self.voice_client.stop()
                log_to_file(f"Bot {self.bot_index + 1} stopped playback")

        elif content == "!ds10":
            if self.voice_client and self.voice_client.is_connected():
                await self.voice_client.disconnect()
                self.voice_client = None
                log_to_file(f"Bot {self.bot_index + 1} disconnected")

async def start_bots():
    intents = discord.Intents.default()
    intents.message_content = True
    intents.voice_states = True
    
    tasks = []
    for i in range(NUM_BOTS):
        token = os.getenv(f"BOT_TOKEN_{i}")
        if token:
            bot = MultiBot(bot_index=i, command_prefix="!", intents=intents)
            
            async def run_bot(b, t, index):
                retries = 100
                for attempt in range(retries):
                    try:
                        # Wait 10 seconds between each bot login to prevent Discord IP ban
                        if index > 0 and attempt == 0:
                            log_to_file(f"Bot {index + 1} waiting {index * 10} seconds before login...")
                            await asyncio.sleep(index * 10)
                        
                        await b.start(t)
                        break
                    except Exception as e:
                        if "429" in str(e) or "1015" in str(e):
                            wait_time = 60 # Wait 1 minute before retrying
                            log_to_file(f"Bot {index + 1} got Discord IP Ban (1015). Retrying in {wait_time}s... (Attempt {attempt + 1}/{retries})")
                            await asyncio.sleep(wait_time)
                        else:
                            log_to_file(f"Bot {index + 1} failed to start: {e}")
                            break
                    
            tasks.append(run_bot(bot, token, i))
            bots.append(bot)
            log_to_file(f"Initialized Bot {i + 1}")
        else:
            log_to_file(f"Token for Bot {i} not found")

    if tasks:
        log_to_file("Starting all bots...")
        await asyncio.gather(*tasks)
    else:
        log_to_file("No tasks to run. Exiting...")

if __name__ == "__main__":
    import time
    try:
        # Clear the log file on startup
        with open(LOG_FILE, "w") as f:
            f.write("--- Starting application ---\n")
        log_to_file("Starting application...")
        asyncio.run(start_bots())
    except KeyboardInterrupt:
        log_to_file("Shutting down...")
    except Exception as e:
        log_to_file(f"Fatal error: {e}")
    finally:
        log_to_file("Application stopped. Waiting indefinitely so you can read the logs...")
        while True:
            time.sleep(1)
