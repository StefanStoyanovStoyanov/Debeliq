const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const olueDataPath = path.join(dataDir, "olue_data.json");

async function ensureDataDir() {
    await fs.mkdir(dataDir, { recursive: true });
}

async function loadOlueData() {
    await ensureDataDir();
    let data;
    try {
        data = await fs.readFile(olueDataPath, "utf8");
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
        await fs.writeFile(olueDataPath, "{}", "utf8");
        return {};
    }

    const parsedData = JSON.parse(data || "{}");
    if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
        throw new Error("Olue data must contain an object.");
    }
    return parsedData;
}

async function saveOlueData(data) {
    await ensureDataDir();
    await fs.writeFile(olueDataPath, JSON.stringify(data, null, 2), "utf8");
}

let dataUpdateQueue = Promise.resolve();

function updateOlueScore(userId, score) {
    const update = dataUpdateQueue.then(async () => {
        const savedData = await loadOlueData();
        savedData[userId] = { score };
        await saveOlueData(savedData);
    });
    dataUpdateQueue = update.catch((error) => {
        console.error("Error updating Olue data:", error);
    });
    return update;
}

function getScore(data, userId) {
    const score = data[userId]?.score ?? 0;
    if (!Number.isSafeInteger(score) || score < 0) {
        throw new Error(`Invalid saved score for user ${userId}.`);
    }
    return score;
}

function rng(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSpecialNumbers() {
    const gridSize = Math.max(2, rng(2, 5));
    const uniqueNumbers = new Set();

    while (uniqueNumbers.size < gridSize) {
        uniqueNumbers.add(rng(1, 10));
    }

    return Array.from(uniqueNumbers);
}

function createGameGrid(score = 0, specialNumbers = null, selectedCells = new Set()) {
    const currentSpecialNumbers = specialNumbers || generateSpecialNumbers();
    const totalColumns = 10;
    const maxColumnsPerRow = 5;

    let gridChunks = [];
    for (let startCol = 0; startCol < totalColumns; startCol += maxColumnsPerRow) {
        const endCol = Math.min(startCol + maxColumnsPerRow, totalColumns);
        let chunk = `  _____  `.repeat(endCol - startCol) + "\n";
        for (let row = 0; row < 3; row++) {
            chunk +=
                Array.from({ length: endCol - startCol }, (_, colIndex) => {
                    const col = startCol + colIndex + 1;
                    if (selectedCells.has(col)) return " |XXXXX| ";
                    if (currentSpecialNumbers.includes(col)) return " |OOOOO| ";
                    return " |     | ";
                }).join("") + "\n";
        }
        chunk += `  ‾‾‾‾‾  `.repeat(endCol - startCol) + "\n";
        chunk += Array.from({ length: endCol - startCol }, (_, i) => `    ${startCol + i + 1}    `).join("") + "\n";
        gridChunks.push(chunk);
    }
    const gridOutput = [`Score: ${score}`, ...gridChunks].join("\n");

    const numberButtons = Array.from({ length: totalColumns }, (_, index) =>
        new ButtonBuilder()
            .setCustomId(`number_${index + 1}`)
            .setLabel(`${index + 1}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(selectedCells.has(index + 1)),
    );
    const buttonRows = [
        new ActionRowBuilder().addComponents(...numberButtons.slice(0, 5)),
        new ActionRowBuilder().addComponents(...numberButtons.slice(5)),
    ];
    return {
        content: "```" + gridOutput + "```",
        components: buttonRows,
        specialNumbers: currentSpecialNumbers,
    };
}

const gameStates = new Map();

module.exports = {
    data: new SlashCommandBuilder().setName("olue").setDescription("Play Olue the Game."),

    async execute(interaction) {
        const userId = interaction.user.id;
        const savedData = await loadOlueData();
        const currentScore = getScore(savedData, userId);

        const userState = {
            score: currentScore,
            selectedCells: new Set(),
            specialNumbers: generateSpecialNumbers(),
            processing: false,
        };

        const { content, components } = createGameGrid(currentScore, userState.specialNumbers);
        await interaction.reply({ content, components });
        const reply = await interaction.fetchReply();
        gameStates.set(reply.id, { userId, userState });
    },

    async handleButton(interaction) {
        const storedState = gameStates.get(interaction.message.id);
        if (!storedState) {
            await interaction.reply({ content: "This game is no longer active.", ephemeral: true });
            return;
        }
        if (storedState.userId !== interaction.user.id) {
            await interaction.reply({ content: "Only the player who started this game can use these buttons.", ephemeral: true });
            return;
        }
        const userId = storedState.userId;
        const userState = storedState.userState;
        if (userState.processing) {
            await interaction.reply({ content: "Your previous move is still being processed.", ephemeral: true });
            return;
        }
        userState.processing = true;

        const customId = interaction.customId;

        try {
            if (customId === "retry") {
                const savedData = await loadOlueData();
                const currentScore = getScore(savedData, userId);
                userState.score = currentScore;
                userState.selectedCells = new Set();
                userState.specialNumbers = generateSpecialNumbers();

                const { content, components } = createGameGrid(currentScore, userState.specialNumbers);
                await interaction.update({ content, components });
                return;
            }

            if (customId.startsWith("number_")) {
                const chosenNumber = Number(customId.slice("number_".length));
                if (
                    !Number.isInteger(chosenNumber) ||
                    chosenNumber < 1 ||
                    chosenNumber > 10 ||
                    userState.selectedCells.has(chosenNumber)
                ) {
                    await interaction.reply({ content: "That number is not available.", ephemeral: true });
                    return;
                }

                if (userState.specialNumbers.includes(chosenNumber)) {
                    const nextScore = userState.score + 1;
                    await updateOlueScore(userId, nextScore);
                    userState.selectedCells.add(chosenNumber);
                    userState.score = nextScore;

                    if (userState.specialNumbers.every((num) => userState.selectedCells.has(num))) {
                        userState.selectedCells.clear();
                        userState.specialNumbers = generateSpecialNumbers();

                        const { content, components } = createGameGrid(userState.score, userState.specialNumbers);
                        await interaction.update({ content, components });
                    } else {
                        const { content, components } = createGameGrid(
                            userState.score,
                            userState.specialNumbers,
                            userState.selectedCells,
                        );
                        await interaction.update({ content, components });
                    }
                } else {
                    const finalScore = userState.score;
                    await updateOlueScore(userId, 0);

                    userState.score = 0;
                    userState.selectedCells = new Set();
                    userState.specialNumbers = generateSpecialNumbers();

                    const retryButton = new ButtonBuilder()
                        .setCustomId("retry")
                        .setLabel("Retry")
                        .setStyle(ButtonStyle.Primary);
                    const retryRow = new ActionRowBuilder().addComponents(retryButton);

                    await interaction.update({
                        content: `\`\`\`Game Over. Your final score is ${finalScore}\`\`\``,
                        components: [retryRow],
                    });
                }
                return;
            }

            await interaction.reply({ content: "That game action is not available.", ephemeral: true });
        } catch (error) {
            console.error("Error in handleButton:", error);
            await interaction.reply({
                content: "There was an error processing your move. Please try again.",
                ephemeral: true,
            });
        } finally {
            userState.processing = false;
        }
    },
};
