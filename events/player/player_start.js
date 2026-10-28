const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "playerStart",
    type: "player",
    once: false,
    execute(queue, track) {
        return sendQueueMessage(queue, `Started playing **${track.title}**.`);
    },
};
