const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("skip").setDescription("Play next song in queue."),

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

        const trackTitle = queue.currentTrack.title;
        if (!queue.node.skip()) {
            await interaction.reply({
                content: "Could not skip the current track. Please try again.",
                ephemeral: true,
            });
            return;
        }

        await interaction.reply(`Skipping **${trackTitle}**.`);
    },
};
