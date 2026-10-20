module.exports = {
    name: "audioTracksAdd",
    type: "player",
    once: false,
    execute(queue, track) {
        queue.metadata.channel.send(`Multiple tracks queued.`);
    },
};
