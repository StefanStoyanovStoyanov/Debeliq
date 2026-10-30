const { Events } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const STEFCHO_ID = "568496102127566873";
const dataDir = path.join(__dirname, "..", "data");
const COUNTER_FILE = path.join(dataDir, "stefcho_sus_counter.txt");
const SUS_WORDS_FILE = path.join(dataDir, "sus_words.txt");

function ensureFilesExist() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(COUNTER_FILE)) {
        fs.writeFileSync(COUNTER_FILE, "0", "utf8");
    }

    if (!fs.existsSync(SUS_WORDS_FILE)) {
        fs.writeFileSync(SUS_WORDS_FILE, "", "utf8");
    }
}

ensureFilesExist();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) {
            return;
        }

        if (message.author.id === STEFCHO_ID) {
            try {
                const susWordsData = fs.readFileSync(SUS_WORDS_FILE, "utf8");
                const susWords = susWordsData
                    .trim()
                    .split("\n")
                    .map((word) => word.trim().toLowerCase())
                    .filter((word) => word.length > 0);

                const messageContent = message.content.toLowerCase();

                const isSus = susWords.some((word) => messageContent.includes(word));

                if (isSus) {
                    let count = parseInt(fs.readFileSync(COUNTER_FILE, "utf8").trim(), 10) || 0;
                    count++;

                    fs.writeFileSync(COUNTER_FILE, count.toString(), "utf8");
                    console.log(`Stefcho sus counter incremented to: ${count} by message: "${message.content}"`);
                }
            } catch (error) {
                console.error("Error processing stefcho sus counter:", error);
            }
        }

        if (message.content.toLowerCase() === "koj") {
            try {
                await message.reply("te e pital");
            } catch (error) {
                console.error('Failed to reply to "koj" message:', error);
            }
        }
    },
};
