const { SlashCommandBuilder } = require("discord.js");

function generate() {
    const uniqueNumbers = [];
    while (uniqueNumbers.length < 6) {
        const randomNumber = Math.floor(Math.random() * 49) + 1;
        if (!uniqueNumbers.includes(randomNumber)) {
            uniqueNumbers.push(randomNumber);
        }
    }
    return uniqueNumbers;
}

function notUnique(array) {
    return new Set(array).size !== array.length;
}

function notInRange(array) {
    return array.some((number) => number < 1 || number > 49);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("toto")
        .setDescription("Play Toto 6/49.")
        .addIntegerOption((option) => option.setName("1st").setDescription("Number between 1 and 49.").setRequired(true))
        .addIntegerOption((option) => option.setName("2nd").setDescription("Number between 1 and 49.").setRequired(true))
        .addIntegerOption((option) => option.setName("3rd").setDescription("Number between 1 and 49.").setRequired(true))
        .addIntegerOption((option) => option.setName("4th").setDescription("Number between 1 and 49.").setRequired(true))
        .addIntegerOption((option) => option.setName("5th").setDescription("Number between 1 and 49.").setRequired(true))
        .addIntegerOption((option) => option.setName("6th").setDescription("Number between 1 and 49.").setRequired(true)),

    async execute(interaction) {
        try {
            const userNumbers = [
                interaction.options.getInteger("1st"),
                interaction.options.getInteger("2nd"),
                interaction.options.getInteger("3rd"),
                interaction.options.getInteger("4th"),
                interaction.options.getInteger("5th"),
                interaction.options.getInteger("6th"),
            ];

            if (notUnique(userNumbers)) {
                await interaction.reply({ content: "Please ensure all numbers are unique.", ephemeral: true });
                return;
            }

            if (notInRange(userNumbers)) {
                await interaction.reply({ content: "Please ensure all numbers are between 1 and 49.", ephemeral: true });
                return;
            }

            const winningNumbers = generate();
            const correctGuesses = winningNumbers.filter((number) => userNumbers.includes(number)).length;

            const sortedWinningNumbers = [...winningNumbers].sort((a, b) => a - b);
            const formattedWinningNumbers = sortedWinningNumbers.map((number) =>
                userNumbers.includes(number) ? `**${number}**` : `${number}`,
            );

            let prize = 0;
            switch (correctGuesses) {
                case 6:
                    prize = 7000000;
                    break;
                case 5:
                    prize = 10000;
                    break;
                case 4:
                    prize = 100;
                    break;
                case 3:
                    prize = 10;
                    break;
                case 2:
                    prize = 1;
                    break;
                case 1:
                    prize = 0.01;
                    break;
            }

            let resultMessage;
            switch (correctGuesses) {
                case 6:
                    resultMessage = `Congratulations. You've won the jackpot of **${prize}**.`;
                    break;
                case 5:
                    resultMessage = `Congratulations. You've won **${prize}**.`;
                    break;
                case 4:
                    resultMessage = `Congratulations. You've won **${prize}**.`;
                    break;
                case 3:
                    resultMessage = `Congratulations. You've won **${prize}**.`;
                    break;
                case 2:
                    resultMessage = `Congratulations. You've won **${prize}**.`;
                    break;
                case 1:
                    resultMessage = `Congratulations. You've won **${prize}**.`;
                    break;
                default:
                    resultMessage = `Sorry, you didn't win anything this time.`;
                    break;
            }

            await interaction.reply(`${resultMessage}\nThe winning numbers were: ${formattedWinningNumbers.join(", ")}.`);
        } catch (error) {
            console.error("Error in toto command:", error);
            await interaction.reply({
                content: "An error occurred while processing your request. Please try again later.",
                ephemeral: true,
            });
        }
    },
};
