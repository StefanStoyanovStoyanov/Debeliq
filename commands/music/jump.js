const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("jump")
        .setDescription("Jump to a specific position in the queue")
        .addIntegerOption((option) =>
            option.setName("position").setDescription("The position in the queue to jump to").setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.node.isPlaying()) {
            await interaction.reply({
                content: "There is no music currently playing.",
                ephemeral: true,
            });
            return;
        }

        const position = interaction.options.getInteger("position");

        if (position < 1 || position > queue.tracks.size) {
            await interaction.reply({
                content: `Invalid position. Please provide a position between 1 and ${queue.tracks.size}.`,
                ephemeral: true,
            });
            return;
        }

        queue.node.skipTo(position - 1);

        await interaction.reply(`Jumped to track #${position}.`);
    },
};
