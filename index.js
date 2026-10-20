const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const fs = require("node:fs");
const path = require("node:path");

const config = require("./config.json");
const TOKEN = config.token;
const CLIENT_ID = config.client_id;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();
client.activeGames = new Collection();

const player = new Player(client, {
    skipFFmpeg: false,
    ytdlOptions: {
        quality: "highestaudio",
        highWaterMark: 1 << 25,
    },
});
client.player = player;

player.extractors.loadMulti(DefaultExtractors).catch((error) => {
    console.error("Failed to load Discord Player extractors:", error);
});

const commandsToRegister = [];
const commandsPath = path.join(__dirname, "commands");

function loadCommands(directory) {
    const commandFiles = fs.readdirSync(directory, { withFileTypes: true });
    for (const file of commandFiles) {
        const filePath = path.join(directory, file.name);
        if (file.isDirectory()) {
            loadCommands(filePath);
        } else if (file.name.endsWith(".js")) {
            try {
                const command = require(filePath);
                if ("data" in command && "execute" in command) {
                    client.commands.set(command.data.name, command);
                    commandsToRegister.push(command.data.toJSON());
                } else {
                    console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
                }
            } catch (error) {
                console.error(`[ERROR] Could not load command at ${filePath}:`, error);
            }
        }
    }
}
loadCommands(commandsPath);

const eventsPath = path.join(__dirname, "events");
let eventCount = 0;

function loadEvents(directory) {
    const eventFiles = fs.readdirSync(directory, { withFileTypes: true });
    for (const file of eventFiles) {
        const filePath = path.join(directory, file.name);
        if (file.isDirectory()) {
            loadEvents(filePath);
        } else if (file.name.endsWith(".js")) {
            try {
                const event = require(filePath);
                const emitter = event.type === "player" ? player.events : client;

                if (event.once) {
                    emitter.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    emitter.on(event.name, (...args) => event.execute(...args, client));
                }
                eventCount++;
            } catch (error) {
                console.error(`[ERROR] Could not load event at ${filePath}:`, error);
            }
        }
    }
}
loadEvents(eventsPath);

const rest = new REST().setToken(TOKEN);

client.once("ready", async () => {
    try {
        const guilds = client.guilds.cache.map((guild) => guild.id);

        for (const guildId of guilds) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commandsToRegister });
        }

        console.log(`Loaded and synced ${commandsToRegister.length} commands.`);
    } catch (error) {
        console.error(error);
    }
});

client.login(TOKEN).catch((error) => {
    console.error("Failed to log in to Discord:", error);
    process.exit(1);
});
