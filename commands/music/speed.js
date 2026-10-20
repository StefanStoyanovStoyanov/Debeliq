const { SlashCommandBuilder } = require("discord.js");
const { AudioFilters, useQueue } = require("discord-player");

const SPEED_FILTER_PREFIX = "debel_speed_";

function getAtempoFilter(speed) {
    if (speed <= 2) {
        return `atempo=${speed}`;
    }

    return `atempo=2.0,atempo=${speed / 2}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("speed")
        .setDescription("Change the playback speed of the current song.")
        .addNumberOption((option) =>
            option
                .setName("factor")
                .setDescription("Playback speed (0.5x to 3x)")
                .setMinValue(0.5)
                .setMaxValue(3.0)
                .setRequired(true)
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack || !queue.node.isPlaying()) {
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
            const speedFilterName = `${SPEED_FILTER_PREFIX}${speed.toString().replace(".", "_")}`;
            AudioFilters.define(speedFilterName, getAtempoFilter(speed));

            const filters = queue.filters.ffmpeg.filters.filter((filter) => !filter.startsWith(SPEED_FILTER_PREFIX));
            if (speed !== 1) {
                filters.push(speedFilterName);
            }
            await queue.filters.ffmpeg.setFilters(filters);
            await interaction.reply(`Playback speed set to ${speed}x.`);
        } catch (err) {
            console.error("Error in speed command:", err);
            await interaction.reply({
                content: "Failed to change playback speed. Please try again.",
                ephemeral: true,
            });
        }
    },
};
