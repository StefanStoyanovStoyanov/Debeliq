const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder().setName("koj").setDescription("Test command."),

    async execute(interaction) {
        await interaction.reply("te e pital");
    },
};
