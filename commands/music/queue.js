const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

const SPEED_FILTER_PREFIX = "debel_speed_";
const PROGRESS_BAR_LENGTH = 15;

function getPlaybackSpeed(queue) {
    const speedFilter = queue.filters.ffmpeg.filters.find((filter) => filter.startsWith(SPEED_FILTER_PREFIX));
    if (!speedFilter) {
        return 1;
    }

    const speed = Number(speedFilter.slice(SPEED_FILTER_PREFIX.length).replace("_", "."));
    return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(Math.max(milliseconds, 0) / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createProgressBar(queue, track) {
    const speed = getPlaybackSpeed(queue);
    const playbackTime = queue.node.playbackTime / speed;
    const duration = track.durationMS / speed;
    const progress = duration > 0 ? Math.max(0, Math.min(playbackTime / duration, 1)) : 0;
    const indicatorIndex = Math.min(Math.round(progress * PROGRESS_BAR_LENGTH), PROGRESS_BAR_LENGTH - 1);
    const bar =
        "\u25AC".repeat(indicatorIndex) +
        "\u{1F518}" +
        "\u25AC".repeat(PROGRESS_BAR_LENGTH - indicatorIndex - 1);

    return `${formatTime(playbackTime)} ┃ ${bar} ┃ ${formatTime(duration)}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Show songs in the queue and current track.")
        .addStringOption((option) =>
            option
                .setName("view")
                .setDescription("Choose what to view.")
                .addChoices(
                    { name: "First 10 songs", value: "first" },
                    { name: "Last 10 songs", value: "last" },
                    { name: "Queue size", value: "size" },
                ),
        ),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
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

        const viewOption = interaction.options.getString("view") ?? "first";
        const tracksArray = Array.from(queue.tracks.toArray());
        const track = queue.currentTrack;

        if (viewOption === "size") {
            const embed = new EmbedBuilder()
                .setTitle("Queue Information")
                .setDescription(
                    `There are currently **${tracksArray.length}** songs in the queue\nNow playing: **${track.title}**`,
                );

            if (track.thumbnail && track.thumbnail.trim() !== "") {
                embed.setThumbnail(track.thumbnail);
            }

            await interaction.reply({ embeds: [embed] });
            return;
        }

        const showLast = viewOption === "last";
        const tracksToShow = showLast ? tracksArray.slice(Math.max(tracksArray.length - 10, 0)) : tracksArray.slice(0, 10);

        const embed = new EmbedBuilder()
            .setAuthor({ name: "Now Playing:" })
            .setTitle(track.title)
            .setURL(track.url)
            .setDescription(
                createProgressBar(queue, track) +
                    "\n\n" +
                    tracksToShow
                        .map((track, i) => {
                            const position = showLast ? tracksArray.length - (tracksToShow.length - i) + 1 : i + 1;
                            return `**#${position}** - Title: **${track.title}** | Uploaded by: **${track.author}**`;
                        })
                        .join("\n"),
            );

        if (track.thumbnail && track.thumbnail.trim() !== "") {
            embed.setThumbnail(track.thumbnail);
        }

        await interaction.reply({ embeds: [embed] });
    },
};
