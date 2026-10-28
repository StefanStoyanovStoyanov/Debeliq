const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "emptyChannel",
    type: "player",
    once: false,
    execute(queue) {
        return sendQueueMessage(queue, "Leaving because there is no one in the voice channel.");
    },
};
