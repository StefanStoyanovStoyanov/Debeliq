module.exports = {
    name: "emptyChannel",
    type: "player",
    once: false,
    execute(queue) {
        queue.metadata.channel.send(`Leaving because there is no one in the voice channel.`);
    },
};
