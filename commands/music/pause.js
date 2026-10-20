const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder().setName("pause").setDescription("Pause or resume the queue"),

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
        if (!queue) {
            await interaction.reply({
                content: "There is no music currently playing.",
                ephemeral: true,
            });
            return;
        }

        queue.node.setPaused(!queue.node.isPaused());

        if (queue.node.isPaused()) await interaction.reply("Music was paused successfully.");
        else await interaction.reply("Music was resumed successfully.");
    },
};
