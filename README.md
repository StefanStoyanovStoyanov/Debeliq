# Debeliq

Debeliq is a Discord bot built with Node.js, discord.js, and Discord Player. It combines voice-channel music playback, chat games, and utility commands.

## Features

- **Music:** Play tracks and playlists, manage the queue, seek, adjust playback, and apply filters.
- **Games:** Cows and Bulls, Deal, Olue, and Toto.
- **Utilities:** Chess-position analysis, random number generation, ping, and other server-specific tools.
- **Code execution:** `/execute_code` supports JavaScript, Python, C, C++, Rust, and Java when the bot runs in Docker. Only enable this command in a trusted, appropriately isolated environment.

## Requirements

- Node.js 18 or newer and npm
- A Discord application and bot token
- Python and the packages listed in `commands/other/chess_solver/requirements.txt` if you want to use `/chess_solver`
- Docker and the relevant language runtimes/compilers if you want to use `/execute_code`

## Setup

1. Clone the repository and install the Node.js dependencies:

   ```sh
   npm install
   ```

2. Create `config.json` in the project root. This file is intentionally ignored by Git:

   ```json
   {
     "token": "YOUR_DISCORD_BOT_TOKEN",
     "client_id": "YOUR_DISCORD_APPLICATION_ID"
   }
   ```

   Keep the bot token private. If it has ever been exposed, reset it in the Discord Developer Portal.

3. In the Discord Developer Portal, enable the **Server Members Intent** and **Message Content Intent** for the bot. Invite it to your server with the `bot` and `applications.commands` scopes and the permissions it needs, including connecting to and speaking in voice channels.

4. Start the bot:

   ```sh
   node index.js
   ```

The bot loads command modules from `commands/` and event handlers from `events/`. On startup, it registers its slash commands in every server the bot is currently in. Newly added servers receive commands the next time the bot starts.

## Optional features

### Chess solver

Install the Python dependencies from the chess solver directory:

```sh
python -m pip install -r commands/other/chess_solver/requirements.txt
```

The solver also relies on the model and Stockfish assets in `commands/other/chess_solver/assets/`. Use `/chess_solver` with a clear image of a complete chessboard and select which color is at the bottom.

### Code execution

`/execute_code` only runs when the bot process detects that it is inside Docker. It also expects the selected language's runtime or compiler to be available in that environment. Do not expose this command to untrusted users or treat a general-purpose container as a security boundary.

## Command groups

- `commands/music/` — playback, queue, and audio controls
- `commands/games/` — chat-based games
- `commands/other/` — utilities, chess analysis, and code execution
- `events/` — Discord client and music-player event handlers

## Configuration and data

`config.json` contains local credentials and is excluded from version control. Runtime data and game-related files are stored under `data/`. Do not commit credentials or other private server data.
