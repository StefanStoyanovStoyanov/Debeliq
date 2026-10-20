const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seek to a specific timestamp in the current song.")
        .addStringOption((option) =>
            option
                .setName("timestamp")
                .setDescription("The timestamp to seek to (e.g. 1:23 or 83)")
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

        const timestampInput = interaction.options.getString("timestamp");
        let seconds = 0;
        const match = timestampInput.match(/^(?:(\d+):(\d{1,2}))$|^(\d+)$/);
        if (!match) {
            await interaction.reply({
                content: "Invalid timestamp format. Use mm:ss or seconds (e.g. 1:23 or 83).",
                ephemeral: true,
            });
            return;
        }
        if (match[1] && match[2]) {
            seconds = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        } else if (match[3]) {
            seconds = parseInt(match[3], 10);
        }

        const currentTrack = queue.currentTrack;
        if (!currentTrack || typeof currentTrack.durationMS !== "number") {
            await interaction.reply({
                content: "Could not determine the current track duration.",
                ephemeral: true,
            });
            return;
        }
        if (seconds < 0 || seconds * 1000 > currentTrack.durationMS) {
            await interaction.reply({
                content: `Timestamp out of range. The current track is ${(currentTrack.durationMS / 1000).toFixed(0)} seconds long.`,
                ephemeral: true,
            });
            return;
        }

        try {
            await queue.node.seek(seconds * 1000);
            await interaction.reply(`Seeked to ${new Date(seconds * 1000).toISOString().substr(14, 5)} in **${currentTrack.title}**.`);
        } catch (err) {
            await interaction.reply({
                content: `Failed to seek: ${err}`,
                ephemeral: true,
            });
        }
    },
};
