const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set or check the player's volume")
        .addIntegerOption((option) => option.setName("value").setDescription("Volume level")),

    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            await interaction.reply({
                content: "No song is currently playing.",
                ephemeral: true,
            });
            return;
        }

        const volumeValue = interaction.options.getInteger("value");

        if (volumeValue !== null) {
            queue.node.setVolume(volumeValue);
            await interaction.reply(`Volume has been set to ${volumeValue}%.`);
        } else {
            const currentVolume = queue.node.volume;
            await interaction.reply(`The current volume is ${currentVolume}%.`);
        }
    },
};
