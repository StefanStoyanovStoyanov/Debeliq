const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seek to a specific timestamp in the current song.")
        .addStringOption((option) =>
            option.setName("timestamp").setDescription("The timestamp to seek to (e.g. 1:23 or 83)").setRequired(true),
        ),

    async execute(interaction) {
        if (!interaction.member.voice.channel) {
            await interaction.reply({
                content: "You are not connected to a voice channel.",
                ephemeral: true,
            });
            return;
        }

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
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
            const minutes = Number(match[1]);
            const remainder = Number(match[2]);
            if (remainder > 59) {
                await interaction.reply({
                    content: "Invalid timestamp format. Use mm:ss with seconds from 00 to 59, or total seconds.",
                    ephemeral: true,
                });
                return;
            }
            seconds = minutes * 60 + remainder;
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

        await interaction.deferReply();
        try {
            const seeked = await queue.node.seek(seconds * 1000);
            if (!seeked) {
                await interaction.editReply("Failed to seek in the current song. Please try again.");
                return;
            }

            await interaction.editReply(
                `Seeked to ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} in **${currentTrack.title}**.`,
            );
        } catch (err) {
            console.error("Error in seek command:", err);
            await interaction.editReply("Failed to seek in the current song. Please try again.");
        }
    },
};
