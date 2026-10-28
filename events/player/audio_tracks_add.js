const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "audioTracksAdd",
    type: "player",
    once: false,
    execute(queue, track) {
        return sendQueueMessage(queue, "Multiple tracks queued.");
    },
};
