module.exports = {
    name: "audioTrackAdd",
    type: "player",
    once: false,
    execute(queue, track) {
        queue.metadata.channel.send(`Track **${track.title}** queued.`);
    },
};
