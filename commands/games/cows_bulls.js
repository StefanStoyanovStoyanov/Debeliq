const { SlashCommandBuilder } = require("discord.js");

function hasDuplicates(array) {
    return new Set(array).size !== array.length;
}

function ending(number) {
    const lastDigit = number % 10;
    const lastTwoDigits = number % 100;

    if (lastDigit === 1 && lastTwoDigits !== 11) return "st";
    if (lastDigit === 2 && lastTwoDigits !== 12) return "nd";
    if (lastDigit === 3 && lastTwoDigits !== 13) return "rd";
    return "th";
}

function generateSecretNumber() {
    let digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let number = "";

    const firstDigitIndex = Math.floor(Math.random() * 9) + 1;
    const firstDigit = digits.splice(firstDigitIndex, 1)[0];
    number += firstDigit;

    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        const digit = digits.splice(randomIndex, 1)[0];
        number += digit;
    }
    return number;
}

function calculateCowsAndBulls(secret, guess) {
    let bulls = 0;
    let cows = 0;
    const secretStr = String(secret);
    const guessStr = String(guess);

    for (let i = 0; i < secretStr.length; i++) {
        if (secretStr[i] === guessStr[i]) {
            bulls++;
        } else if (secretStr.includes(guessStr[i])) {
            cows++;
        }
    }
    return { bulls, cows };
}

module.exports = {
    data: new SlashCommandBuilder().setName("cows_bulls").setDescription("Play a game of Cows and Bulls!"),

    async execute(interaction, client) {
        const gameKey = `cows_bulls:${interaction.channelId}`;
        if (client.activeGames.has(gameKey)) {
            return interaction.reply({
                content: "A game of Cows and Bulls is already active in this channel!",
                ephemeral: true,
            });
        }

        if (!interaction.channel || typeof interaction.channel.createMessageCollector !== "function") {
            return interaction.reply({
                content: "This game can only be played in a text channel.",
                ephemeral: true,
            });
        }

        await handleGuessingMode(interaction, client, gameKey);
    },
};

async function handleGuessingMode(interaction, client, gameKey) {
    const secretNumber = generateSecretNumber();
    const gameData = {
        gameType: "cows_bulls",
        mode: "guessing",
        channelId: interaction.channelId,
        secretNumber: secretNumber,
        guesses: 0,
    };

    client.activeGames.set(gameKey, gameData);

    try {
        await interaction.reply(
            `I've generated a 4-digit number (all unique digits, not starting with zero).\n` +
                `Everyone in this channel can guess. Type a 4-digit guess, or type \`stop\` to end the game.`,
        );
    } catch (error) {
        client.activeGames.delete(gameKey);
        throw error;
    }

    const collector = interaction.channel.createMessageCollector({
        filter: (message) => !message.author.bot && message.channelId === interaction.channelId,
        time: 300000,
    });

    collector.on("collect", async (message) => {
        try {
            const input = message.content.trim();
            const normalizedInput = input.toLowerCase();

            if (normalizedInput === "stop") {
                collector.stop("manual");
                await message.reply("Game stopped. You can start a new one anytime.");
                return;
            }

            if (!/^\d{4}$/.test(input) || input[0] === "0" || hasDuplicates(input.split(""))) {
                return;
            }

            gameData.guesses++;
            const { bulls, cows } = calculateCowsAndBulls(gameData.secretNumber, input);

            if (bulls === 4) {
                const replyContent = `Congratulations, ${message.author.username}! You guessed the number **${
                    gameData.secretNumber
                }** in **${gameData.guesses}${ending(gameData.guesses)}** attempt!`;
                collector.stop("won");
                await message.reply(replyContent);
            } else {
                await message.reply(
                    `Your guess \`${input}\` has **${bulls}** bull${bulls !== 1 ? "s" : ""} and **${cows}** cow${
                        cows !== 1 ? "s" : ""
                    }.`,
                );
            }
        } catch (error) {
            console.error("Error processing Cows and Bulls guess:", error);
        }
    });

    collector.on("end", (collected, reason) => {
        if (client.activeGames.get(gameKey) === gameData) {
            client.activeGames.delete(gameKey);
        }
        if (reason === "time") {
            interaction
                .followUp("The game has ended due to inactivity.")
                .catch((error) => console.error("Failed to announce Cows and Bulls timeout:", error));
        }
    });
}
