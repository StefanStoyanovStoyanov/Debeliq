const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

function shuffleCases(cases) {
    for (let i = cases.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cases[i].value, cases[j].value] = [cases[j].value, cases[i].value];
    }
}

function removeCase(caseNumber, cases) {
    const index = cases.findIndex((c) => c.number == caseNumber);
    if (index !== -1) cases.splice(index, 1);
}

function formatCurrency(amount) {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function calculateBankerOffer(cases) {
    const totalValue = cases.reduce((sum, c) => sum + c.value, 0);
    const expectedValue = totalValue / cases.length;
    const roundNumber = 10 - Math.floor((cases.length - 1) / 3);
    const offer = Math.floor(expectedValue * (roundNumber / 9));
    return offer;
}

function calculateRemainingCasesToPick(cases) {
    const specialRounds = [20, 15, 11, 8, 6, 5, 4, 3];
    if (cases.length > 2) {
        const index = specialRounds.indexOf(cases.length);
        if (index !== -1 && index + 1 < specialRounds.length) {
            return specialRounds[index] - specialRounds[index + 1];
        }
    }
    return 1;
}

function createGameState() {
    return {
        isActive: true,
        cases: [
            { number: 1, value: 0.01 },
            { number: 2, value: 1 },
            { number: 3, value: 5 },
            { number: 4, value: 10 },
            { number: 5, value: 25 },
            { number: 6, value: 50 },
            { number: 7, value: 75 },
            { number: 8, value: 100 },
            { number: 9, value: 200 },
            { number: 10, value: 300 },
            { number: 11, value: 400 },
            { number: 12, value: 500 },
            { number: 13, value: 750 },
            { number: 14, value: 1000 },
            { number: 15, value: 5000 },
            { number: 16, value: 10000 },
            { number: 17, value: 25000 },
            { number: 18, value: 50000 },
            { number: 19, value: 75000 },
            { number: 20, value: 100000 },
            { number: 21, value: 200000 },
            { number: 22, value: 300000 },
            { number: 23, value: 400000 },
            { number: 24, value: 500000 },
            { number: 25, value: 750000 },
            { number: 26, value: 1000000 },
        ],
        yourCase: 0,
        isAwaitingDeal: false,
        remainingCasesToPick: 6,
    };
}

function createCaseButtons(gameState, disabledNumbers = [], page = 1) {
    const casesPerPage = 13;
    const startIndex = (page - 1) * casesPerPage;
    const endIndex = startIndex + casesPerPage;

    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (let i = startIndex; i < endIndex; i++) {
        if (i >= 26) break;

        const caseNumber = i + 1;
        const isDisabled = disabledNumbers.includes(caseNumber) || !gameState.cases.some((c) => c.number === caseNumber);

        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`case_${caseNumber}`)
                .setLabel(`${caseNumber}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(isDisabled)
        );

        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    }

    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`page_prev_${page}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`page_next_${page}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(endIndex >= 26)
    );

    rows.push(navigationRow);
    return rows;
}

function createDealButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("deal_yes").setLabel("DEAL").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("deal_no").setLabel("NO DEAL").setStyle(ButtonStyle.Danger)
        ),
    ];
}

function displayAllValues(gameState) {
    const allValues = [
        0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000,
        300000, 400000, 500000, 750000, 1000000,
    ];
    const remaining = gameState.cases.map((c) => c.value);
    const formatted = allValues.map((v) =>
        remaining.includes(v) ? `**${formatCurrency(v)}**` : `~~${formatCurrency(v)}~~`
    );
    const half = Math.ceil(formatted.length / 2);
    const lines = [];
    for (let i = 0; i < half; i++) {
        const leftValue = formatted[i];
        const rightValue = formatted[i + half] || "";
        lines.push(`${leftValue.padEnd(20)}${rightValue}`);
    }
    return `Values:\n${lines.join("\n")}`;
}

function createGameEmbed(gameState, additionalInfo = "") {
    const embed = new EmbedBuilder().setTitle("Deal or No Deal");

    if (gameState.yourCase === 0) {
        embed.setDescription("Choose your case!");
    } else {
        embed.addFields(
            { name: "Your Case", value: `${gameState.yourCase}`, inline: true },
            { name: "Cases to Open", value: `${gameState.remainingCasesToPick}`, inline: true }
        );
        if (additionalInfo) {
            embed.addFields({ name: "Last Action", value: additionalInfo });
        }
        embed.addFields({
            name: "Values",
            value: displayAllValues(gameState),
        });
    }

    return embed;
}

const gameStates = new Map();

module.exports = {
    data: new SlashCommandBuilder().setName("deal").setDescription("Play Deal or No Deal"),

    async execute(interaction) {
        const gameState = createGameState();
        shuffleCases(gameState.cases);
        gameStates.set(interaction.user.id, gameState);

        const embed = createGameEmbed(gameState);
        const buttons = createCaseButtons(gameState);

        await interaction.reply({ embeds: [embed], components: buttons });
    },

    async handleButton(interaction) {
        const gameState = gameStates.get(interaction.user.id);
        if (!gameState || !gameState.isActive) return;

        let embed;
        let components;
        let additionalInfo = "";

        if (interaction.customId.startsWith("page_")) {
            const [_, direction, currentPage] = interaction.customId.split("_");
            const newPage = direction === "prev" ? parseInt(currentPage) - 1 : parseInt(currentPage) + 1;

            components = createCaseButtons(gameState, [gameState.yourCase], newPage);
            embed = createGameEmbed(gameState, "Navigating between case pages.");
        } else if (interaction.customId.startsWith("case_")) {
            const chosenNumber = parseInt(interaction.customId.split("_")[1]);

            if (gameState.yourCase === 0) {
                gameState.yourCase = chosenNumber;
                additionalInfo = `You chose case ${chosenNumber} as your case!`;
                embed = createGameEmbed(gameState, additionalInfo);
                components = createCaseButtons(gameState, [chosenNumber], 1);
            } else {
                const chosenCase = gameState.cases.find((c) => c.number === chosenNumber);
                additionalInfo = `Case ${chosenNumber} contained ${formatCurrency(chosenCase.value)}!`;
                removeCase(chosenNumber, gameState.cases);
                gameState.remainingCasesToPick--;

                if (gameState.remainingCasesToPick <= 0) {
                    if ([20, 15, 11, 8, 6, 5, 4, 3].includes(gameState.cases.length)) {
                        const offer = calculateBankerOffer(gameState.cases);
                        additionalInfo += `\n\nThe banker offers you ${formatCurrency(offer)}. Deal or No Deal?`;
                        gameState.isAwaitingDeal = true;
                        components = createDealButtons();
                    } else if (gameState.cases.length === 2) {
                        additionalInfo += "\n\nDo you want to switch your case with the last remaining one?";
                        components = createDealButtons();
                        gameState.isAwaitingDeal = true;
                    } else {
                        gameState.remainingCasesToPick = calculateRemainingCasesToPick(gameState.cases);
                        components = createCaseButtons(gameState, [gameState.yourCase], 1);
                    }
                } else {
                    components = createCaseButtons(gameState, [gameState.yourCase], 1);
                }
                embed = createGameEmbed(gameState, additionalInfo);
            }
        } else if (interaction.customId.startsWith("deal_")) {
            const decision = interaction.customId.split("_")[1];

            if (decision === "yes") {
                if (gameState.cases.length === 2) {
                    const switchCase = gameState.cases.find((c) => c.number !== gameState.yourCase);
                    additionalInfo = `You switched to case ${switchCase.number} and won ${formatCurrency(
                        switchCase.value
                    )}!`;
                } else {
                    const offer = calculateBankerOffer(gameState.cases);
                    const yourCaseValue = gameState.cases.find((c) => c.number === gameState.yourCase).value;
                    additionalInfo = `Congratulations! You accepted the deal for ${formatCurrency(offer)}!\nYour case ${
                        gameState.yourCase
                    } contained ${formatCurrency(yourCaseValue)}!`;
                }
                gameState.isActive = false;
            } else {
                if (gameState.cases.length === 2) {
                    const yourCaseValue = gameState.cases.find((c) => c.number === gameState.yourCase).value;
                    additionalInfo = `You kept your case and won ${formatCurrency(yourCaseValue)}!`;
                    gameState.isActive = false;
                } else {
                    gameState.remainingCasesToPick = calculateRemainingCasesToPick(gameState.cases);
                    additionalInfo = "You declined the offer. Continue opening cases!";
                    components = createCaseButtons(gameState, [gameState.yourCase], 1);
                }
            }
            gameState.isAwaitingDeal = false;
            embed = createGameEmbed(gameState, additionalInfo);
        }

        await interaction.update({ embeds: [embed], components: components || [] });
    },
};
