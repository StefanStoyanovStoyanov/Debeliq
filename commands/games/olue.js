const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const olueDataPath = path.join(dataDir, "olue_data.json");

async function ensureDataDir() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch {}
}

async function loadOlueData() {
    try {
        await ensureDataDir();
        try {
            await fs.access(olueDataPath);
        } catch {
            await fs.writeFile(olueDataPath, JSON.stringify({}), "utf8");
        }

        const data = await fs.readFile(olueDataPath, "utf8");
        return JSON.parse(data || "{}");
    } catch (error) {
        console.error("Error loading Olue data:", error);
        return {};
    }
}

async function saveOlueData(data) {
    try {
        await ensureDataDir();
        await fs.writeFile(olueDataPath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error("Error saving Olue data:", error);
    }
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
    const useCompact = true;

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
            .setDisabled(selectedCells.has(index + 1))
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
    data: new SlashCommandBuilder().setName("olue").setDescription("Play Olue the Game"),

    async execute(interaction) {
        const userId = interaction.user.id;
        const savedData = await loadOlueData();
        const currentScore = savedData[userId]?.score ?? 0;

        const userState = {
            score: currentScore,
            selectedCells: new Set(),
            specialNumbers: generateSpecialNumbers(),
        };

        gameStates.set(userId, userState);

        const { content, components } = createGameGrid(currentScore, userState.specialNumbers);
        await interaction.reply({ content, components });
    },

    async handleButton(interaction) {
        const userId = interaction.user.id;
        let userState = gameStates.get(userId);

        if (!userState) {
            userState = {
                score: 0,
                selectedCells: new Set(),
                specialNumbers: generateSpecialNumbers(),
            };
            gameStates.set(userId, userState);
        }

        const customId = interaction.customId;

        try {
            if (customId === "start" || customId === "retry") {
                const savedData = await loadOlueData();
                const currentScore = savedData[userId]?.score ?? 0;
                userState.score = currentScore;
                userState.selectedCells = new Set();
                userState.specialNumbers = generateSpecialNumbers();

                const { content, components } = createGameGrid(currentScore, userState.specialNumbers);
                await interaction.update({ content, components });
                return;
            }

            if (customId.startsWith("number_")) {
                const chosenNumber = parseInt(customId.split("_")[1]);

                if (userState.specialNumbers.includes(chosenNumber)) {
                    userState.selectedCells.add(chosenNumber);
                    userState.score += 1;

                    const savedData = await loadOlueData();
                    savedData[userId] = savedData[userId] || { score: 0 };
                    savedData[userId].score = userState.score;
                    await saveOlueData(savedData);

                    if (userState.specialNumbers.every((num) => userState.selectedCells.has(num))) {
                        userState.selectedCells.clear();
                        userState.specialNumbers = generateSpecialNumbers();

                        const { content, components } = createGameGrid(userState.score, userState.specialNumbers);
                        await interaction.update({ content, components });
                    } else {
                        const { content, components } = createGameGrid(
                            userState.score,
                            userState.specialNumbers,
                            userState.selectedCells
                        );
                        await interaction.update({ content, components });
                    }
                } else {
                    const finalScore = userState.score;
                    const savedData = await loadOlueData();
                    savedData[userId] = { score: 0 };
                    await saveOlueData(savedData);

                    userState.score = 0;
                    userState.selectedCells = new Set();
                    userState.specialNumbers = generateSpecialNumbers();

                    const retryButton = new ButtonBuilder()
                        .setCustomId("retry")
                        .setLabel("Retry")
                        .setStyle(ButtonStyle.Primary);
                    const retryRow = new ActionRowBuilder().addComponents(retryButton);

                    await interaction.update({
                        content: `\`\`\`Game Over! Your final score is ${finalScore}\`\`\``,
                        components: [retryRow],
                    });
                }
            }
        } catch (error) {
            console.error("Error in handleButton:", error);
            await interaction.reply({
                content: "There was an error processing your move. Please try again.",
                ephemeral: true,
            });
        }
    },
};
