const { SlashCommandBuilder } = require("discord.js");
const { useQueue, QueueRepeatMode } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay mode for related songs"),

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

        const isAutoplay = queue.repeatMode === QueueRepeatMode.AUTOPLAY;
        queue.setRepeatMode(isAutoplay ? QueueRepeatMode.OFF : QueueRepeatMode.AUTOPLAY);

        await interaction.reply(
            isAutoplay
                ? "Autoplay mode has been **disabled**."
                : "Autoplay mode has been **enabled**. Related songs will be played automatically."
        );
    },
};
