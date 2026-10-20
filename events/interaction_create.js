const { Events, MessageFlags } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        if (!client) {
            client = interaction.client;
        }

        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.error(`Command not found: ${interaction.commandName}`);
                try {
                    await interaction.reply({
                        content: "That command doesn't seem to exist.",
                        flags: [MessageFlags.Ephemeral],
                    });
                } catch (e) {}
                return;
            }
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error executing command ${interaction.commandName}:`, error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: "There was an error while executing this command!",
                            flags: [MessageFlags.Ephemeral],
                        });
                    } else {
                        await interaction.reply({
                            content: "There was an error while executing this command!",
                            flags: [MessageFlags.Ephemeral],
                        });
                    }
                } catch (e) {}
            }
        } else if (interaction.isButton()) {
            const originalInteraction = interaction.message.interaction;
            if (!originalInteraction) {
                console.warn(`Button clicked on a message not originating from a slash command: ${interaction.customId}`);
                try {
                    await interaction.deferUpdate();
                } catch (e) {}
                return;
            }

            const commandName = originalInteraction.commandName;
            if (!commandName) {
                console.warn(
                    `Button clicked, but original command name couldn't be determined. CustomID: ${interaction.customId}`
                );
                try {
                    await interaction.deferUpdate();
                } catch (e) {}
                return;
            }

            const command = client.commands.get(commandName);
            if (!command) {
                console.error(`Original command ${commandName} for button ${interaction.customId} not found.`);
                try {
                    await interaction.reply({
                        content: "Could not process this button click (originating command not found).",
                        flags: [MessageFlags.Ephemeral],
                    });
                } catch (e) {}
                return;
            }

            if (!command.handleButton || typeof command.handleButton !== "function") {
                console.warn(
                    `Command ${commandName} does not have a handleButton method for button ${interaction.customId}.`
                );
                try {
                    await interaction.deferUpdate();
                } catch (e) {}
                return;
            }

            try {
                await command.handleButton(interaction, client);
            } catch (error) {
                console.error(`Error processing button ${interaction.customId} for command ${commandName}:`, error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({
                            content: "There was an error while processing the button click!",
                            flags: [MessageFlags.Ephemeral],
                        });
                    } else {
                        await interaction.reply({
                            content: "There was an error while processing the button click!",
                            flags: [MessageFlags.Ephemeral],
                        });
                    }
                } catch (e) {}
            }
        }
    },
};
