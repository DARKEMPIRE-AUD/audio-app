import discord
from discord.ext import commands
import asyncio
import os
import threading
from flask import Flask
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Simple Flask server for Render health checks
app = Flask(__name__)

@app.route('/')
def home():
    return "Bot is running"

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
        print(f"Bot {self.bot_index + 1} ({self.user}) is ready!")
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
                print(f"Bot {self.bot_index + 1} joined {channel.name}")
            else:
                await message.channel.send(f"Bot {self.bot_index + 1}: You need to be in a voice channel!")

        elif content == "!st10":
            if self.voice_client and self.voice_client.is_connected():
                if os.path.exists(self.audio_file):
                    if self.voice_client.is_playing():
                        self.voice_client.stop()
                    
                    source = discord.FFmpegPCMAudio(self.audio_file)
                    self.voice_client.play(source)
                    print(f"Bot {self.bot_index + 1} playing {self.audio_file}")
                else:
                    print(f"Bot {self.bot_index + 1}: File {self.audio_file} not found")

        elif content == "!sp10":
            if self.voice_client and self.voice_client.is_playing():
                self.voice_client.stop()
                print(f"Bot {self.bot_index + 1} stopped playback")

        elif content == "!ds10":
            if self.voice_client and self.voice_client.is_connected():
                await self.voice_client.disconnect()
                self.voice_client = None
                print(f"Bot {self.bot_index + 1} disconnected")

async def start_bots():
    intents = discord.Intents.default()
    intents.message_content = True
    intents.voice_states = True
    
    tasks = []
    for i in range(NUM_BOTS):
        token = os.getenv(f"BOT_TOKEN_{i}")
        if token:
            bot = MultiBot(bot_index=i, command_prefix="!", intents=intents)
            
            # Create a wrapper coroutine to catch exceptions for individual bots
            async def run_bot(b, t, index):
                try:
                    await b.start(t)
                except Exception as e:
                    print(f"Bot {index + 1} failed to start: {e}")
                    
            tasks.append(run_bot(bot, token, i))
            bots.append(bot)
            print(f"Initialized Bot {i + 1}")
        else:
            print(f"Token for Bot {i} not found")

    if tasks:
        print("Starting all bots...")
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    try:
        asyncio.run(start_bots())
    except KeyboardInterrupt:
        print("Shutting down...")
