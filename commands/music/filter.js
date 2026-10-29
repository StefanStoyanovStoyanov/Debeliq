const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { AudioFilters, useQueue } = require("discord-player");

const FILTER_CHOICES = [
    ["Off", "off"],
    ["Bass boost (low)", "bassboost_low"],
    ["Bass boost", "bassboost"],
    ["Bass boost (high)", "bassboost_high"],
    ["8D", "8D"],
    ["Vaporwave", "vaporwave"],
    ["Nightcore", "nightcore"],
    ["Phaser", "phaser"],
    ["Tremolo", "tremolo"],
    ["Vibrato", "vibrato"],
    ["Reverse", "reverse"],
    ["Treble", "treble"],
    ["Normalizer", "normalizer"],
    ["Normalizer (alternative)", "normalizer2"],
    ["Surrounding", "surrounding"],
    ["Pulsator", "pulsator"],
    ["Sub boost", "subboost"],
    ["Karaoke", "karaoke"],
    ["Flanger", "flanger"],
    ["Mono", "mono"],
    ["Compressor", "compressor"],
    ["Chorus", "chorus"],
    ["Fade in", "fadein"],
    ["Lo-fi", "lofi"],
    ["Silence removal", "silenceremove"],
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Manage audio effects for the current music queue.")
        .addStringOption((option) =>
            option
                .setName("effect")
                .setDescription("Choose an effect to toggle, or Off to clear all audio effects.")
                .setRequired(true)
                .addChoices(...FILTER_CHOICES.map(([name, value]) => ({ name, value }))),
        ),

    async execute(interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            await interaction.reply({
                content: "You are not connected to a voice channel.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const queue = useQueue(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            await interaction.reply({
                content: "There is no music currently playing.",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const effect = interaction.options.getString("effect", true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let response;
        try {
            const activeFilters = queue.filters.ffmpeg.filters;
            if (effect === "off") {
                const builtInFilters = new Set(AudioFilters.names);
                const remainingFilters = activeFilters.filter((filter) => !builtInFilters.has(filter));
                await queue.filters.ffmpeg.setFilters(remainingFilters);
                response = "All audio effects have been turned **off**.";
            } else {
                const isEnabled = activeFilters.includes(effect);
                const shouldEnable = !isEnabled;
                const nextFilters = activeFilters.filter((filter) => filter !== effect);
                if (shouldEnable) {
                    nextFilters.push(effect);
                }
                await queue.filters.ffmpeg.setFilters(nextFilters);
                response = shouldEnable
                    ? `The **${effect}** effect has been **enabled**.`
                    : `The **${effect}** effect has been **disabled**.`;
            }
        } catch (error) {
            console.error("Error in filter command:", error);
            await interaction.editReply("Failed to update audio effects. Please try again.");
            return;
        }

        await interaction.editReply(response);
    },
};