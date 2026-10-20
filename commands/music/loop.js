const { SlashCommandBuilder } = require("discord.js");
const { useQueue, QueueRepeatMode } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Enable or disable looping of songs or the whole queue")
        .addStringOption((option) =>
            option
                .setName("action")
                .setDescription("What action you want to perform on the loop")
                .setRequired(true)
                .addChoices({ name: "Off", value: "0" }, { name: "Track", value: "1" }, { name: "Queue", value: "2" })
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

        const action = interaction.options.getString("action");

        switch (action) {
            case "0": {
                queue.setRepeatMode(QueueRepeatMode.OFF);
                await interaction.reply("Repeat mode **disabled**.");
                break;
            }
            case "1": {
                queue.setRepeatMode(QueueRepeatMode.TRACK);
                await interaction.reply("Repeat mode **enabled** for the current track.");
                break;
            }
            case "2": {
                queue.setRepeatMode(QueueRepeatMode.QUEUE);
                await interaction.reply("Repeat mode **enabled** for the whole queue.");
                break;
            }
        }
    },
};
