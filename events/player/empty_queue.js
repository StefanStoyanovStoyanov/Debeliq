const { QueueRepeatMode } = require("discord-player");
const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "emptyQueue",
    type: "player",
    once: false,
    execute(queue) {
        if (queue.repeatMode !== QueueRepeatMode.AUTOPLAY) {
            return sendQueueMessage(queue, "Queue finished.");
        }
    },
};
