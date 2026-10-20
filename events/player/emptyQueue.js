const { QueueRepeatMode } = require("discord-player");

module.exports = {
    name: "emptyQueue",
    type: "player",
    once: false,
    execute(queue) {
        if (queue.repeatMode !== QueueRepeatMode.AUTOPLAY) {
            queue.metadata.channel.send("Queue finished.");
        }
    },
};
