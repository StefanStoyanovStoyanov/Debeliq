const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("speed")
        .setDescription("Change the playback speed of the current song.")
        .addNumberOption(option =>
            option
                .setName("factor")
                .setDescription("Speed factor (e.g., 1.5 for 1.5x speed)")
                .setMinValue(0.5)
                .setMaxValue(3.0)
                .setRequired(true)
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

        const speed = interaction.options.getNumber("factor");
        if (speed < 0.5 || speed > 3.0) {
            await interaction.reply({
                content: "Speed factor must be between 0.5 and 3.0.",
                ephemeral: true,
            });
            return;
        }

        try {
            await queue.filters.ffmpeg.setFilters({ atempo: speed.toString() });
            await interaction.reply(`Playback speed set to ${speed}x.`);
        } catch (err) {
            await interaction.reply({
                content: `Failed to change speed: ${err}`,
                ephemeral: true,
            });
        }
    },
};
