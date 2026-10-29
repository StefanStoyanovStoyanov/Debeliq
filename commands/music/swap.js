const { SlashCommandBuilder } = require("discord.js");
const { useQueue } = require("discord-player");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("swap")
        .setDescription("Swap the positions of two tracks in the queue.")
        .addIntegerOption((option) =>
            option.setName("first").setDescription("Position of first track.").setMinValue(1).setRequired(true),
        )
        .addIntegerOption((option) =>
            option.setName("second").setDescription("Position of second track.").setMinValue(1).setRequired(true),
        ),

    async execute(interaction) {
        if (!interaction.member.voice.channel) {
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

        const pos1 = interaction.options.getInteger("first") - 1;
        const pos2 = interaction.options.getInteger("second") - 1;

        if (pos1 < 0 || pos1 >= queue.tracks.size || pos2 < 0 || pos2 >= queue.tracks.size) {
            await interaction.reply({
                content: `Invalid positions. Please provide positions between 1 and ${queue.tracks.size}.`,
                ephemeral: true,
            });
            return;
        }

        queue.node.swap(pos1, pos2);

        await interaction.reply(`Swapped tracks at positions #${pos1 + 1} and #${pos2 + 1}.`);
    },
};
