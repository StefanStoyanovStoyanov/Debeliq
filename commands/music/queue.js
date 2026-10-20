const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Show songs in the queue and current track")
        .addStringOption((option) =>
            option
                .setName("view")
                .setDescription("Choose what to view")
                .addChoices(
                    { name: "First 10 songs", value: "first" },
                    { name: "Last 10 songs", value: "last" },
                    { name: "Queue size", value: "size" }
                )
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
        if (!queue || !queue.node.isPlaying()) {
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
                    `There are currently **${tracksArray.length}** songs in the queue\nNow playing: **${track.title}**`
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
                queue.node.createProgressBar() +
                    "\n\n" +
                    tracksToShow
                        .map((track, i) => {
                            const position = showLast ? tracksArray.length - (tracksToShow.length - i) + 1 : i + 1;
                            return `**#${position}** - Title: **${track.title}** | Uploaded by: **${track.author}**`;
                        })
                        .join("\n")
            );

        if (track.thumbnail && track.thumbnail.trim() !== "") {
            embed.setThumbnail(track.thumbnail);
        }

        await interaction.reply({ embeds: [embed] });
    },
};
