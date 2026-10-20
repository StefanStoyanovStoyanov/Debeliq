module.exports = {
    name: "playerStart",
    type: "player",
    once: false,
    execute(queue, track) {
        queue.metadata.channel.send(`Started playing **${track.title}**.`);
    },
};
