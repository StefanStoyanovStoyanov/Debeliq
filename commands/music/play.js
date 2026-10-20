const { SlashCommandBuilder } = require("discord.js");
const { useMainPlayer, QueueRepeatMode } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or playlist and enables autoplay by default.")
        .addStringOption((option) =>
            option.setName("query").setDescription("Name or URL of the song or playlist").setRequired(true)
        )
        .addBooleanOption((option) =>
            option.setName("next").setDescription("Add the song/playlist next in the queue (after current)")
        ),

    async execute(interaction) {
        const player = useMainPlayer();
        if (!player) {
            return interaction.reply({ content: "Player is not available.", ephemeral: true });
        }
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({ content: "You are not connected to a voice channel!", ephemeral: true });
        }
        const query = interaction.options.getString("query", true);
        const playNext = interaction.options.getBoolean("next") ?? false;

        await interaction.deferReply();

        try {
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
            });

            if (!searchResult || !searchResult.hasTracks()) {
                return interaction.followUp(`No results found for "${query}"!`);
            }

            const playOptions = {
                nodeOptions: {
                    metadata: interaction,
                },
            };

            if (playNext) {
                playOptions.queueInsertStrategy = "immediate";
            }

            const { track, queue } = await player.play(channel, searchResult, playOptions);

            if (queue && queue.repeatMode !== QueueRepeatMode.AUTOPLAY) {
                queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
            }

            let responseMessage;
            if (searchResult.playlist) {
                responseMessage = `Playlist **${searchResult.playlist.title}** (${searchResult.tracks.length} songs) ${
                    playNext && queue.tracks.size > 0 ? "added next to the queue" : "enqueued"
                }!`;
                if (queue.repeatMode === QueueRepeatMode.AUTOPLAY && playNext) {
                    responseMessage += "\nAutoplay is active.";
                } else if (
                    queue.repeatMode === QueueRepeatMode.AUTOPLAY &&
                    !playNext &&
                    queue.tracks.size === searchResult.tracks.length
                ) {
                    responseMessage += "\nAutoplay is active.";
                }
            } else {
                responseMessage = `**${track.title}** ${
                    playNext && queue.tracks.size > 0 ? "added next to the queue" : "enqueued"
                }!`;
                if (queue.repeatMode === QueueRepeatMode.AUTOPLAY && playNext) {
                    responseMessage += "\nAutoplay is active.";
                } else if (queue.repeatMode === QueueRepeatMode.AUTOPLAY && !playNext && queue.tracks.size === 0) {
                    responseMessage += "\nAutoplay is active.";
                }
            }
            if (!searchResult.playlist && queue.currentTrack === track && queue.tracks.size === 0) {
                responseMessage = `Now playing: **${track.title}**!`;
                if (queue.repeatMode === QueueRepeatMode.AUTOPLAY) responseMessage += "\nAutoplay is active.";
            }

            return interaction.followUp(responseMessage);
        } catch (e) {
            console.error("Error in play command:", e);
            return interaction.followUp(`Something went wrong: ${e.message || e}`);
        }
    },
};
