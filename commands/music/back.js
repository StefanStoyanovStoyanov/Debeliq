const { SlashCommandBuilder } = require("discord.js");
const { useQueue, useHistory } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("back").setDescription("Play the previous track"),

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

        const history = useHistory(interaction.guild.id);
        if (history.isEmpty()) {
            await interaction.reply({
                content: "There is no track before this one.",
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        await history.previous();

        await interaction.editReply("Playing previous song.");
    },
};
