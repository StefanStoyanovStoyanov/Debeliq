const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rng")
        .setDescription("Generates random number.")
        .addIntegerOption((option) =>
            option.setName("min").setDescription("The minimum number that can be generated.").setRequired(true),
        )
        .addIntegerOption((option) =>
            option.setName("max").setDescription("The maximum number that can be generated.").setRequired(true),
        ),

    async execute(interaction) {
        const min = interaction.options.getInteger("min");
        const max = interaction.options.getInteger("max");
        if (min > max) {
            await interaction.reply({
                content: "The minimum must be less than or equal to the maximum.",
                ephemeral: true,
            });
            return;
        }
        const randomNumber = Math.floor(Math.random() * (max - min + 1) + min).toString();

        await interaction.reply(randomNumber);
    },
};
