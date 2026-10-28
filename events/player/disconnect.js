const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "disconnect",
    type: "player",
    once: false,
    execute(queue) {
        return sendQueueMessage(queue, "Looks like my job here is done, leaving now.");
    },
};
