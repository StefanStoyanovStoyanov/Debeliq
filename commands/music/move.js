const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("move")
        .setDescription("Move a track from one position in the queue to another")
        .addIntegerOption((option) =>
            option.setName("from").setDescription("The current position of the track to move").setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName("to").setDescription("The new position to move the track to").setRequired(true)
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

        const from = interaction.options.getInteger("from") - 1;
        const to = interaction.options.getInteger("to") - 1;

        if (from < 0 || from >= queue.tracks.size || to < 0 || to >= queue.tracks.size) {
            await interaction.reply({
                content: `Invalid positions. Please provide positions between 1 and ${queue.tracks.size}.`,
                ephemeral: true,
            });
            return;
        }

        queue.node.move(from, to);
        await interaction.reply(`Moved track from position #${from + 1} to position #${to + 1}.`);
    },
};
