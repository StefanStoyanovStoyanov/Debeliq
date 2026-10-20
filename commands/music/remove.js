const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a specific track from the queue")
        .addIntegerOption((option) =>
            option.setName("number").setDescription("The track number you want to remove").setRequired(true)
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

        const trackNumber = interaction.options.getInteger("number");
        const tracks = queue.tracks.toArray();

        if (tracks.length < trackNumber) {
            await interaction.reply({
                content: "There is no track with that number.",
                ephemeral: true,
            });
            return;
        }

        queue.removeTrack(trackNumber - 1);

        await interaction.reply(`Track number ${trackNumber} was removed.`);
    },
};
