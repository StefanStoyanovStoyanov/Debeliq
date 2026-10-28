const { sendQueueMessage } = require("../../utils/queue_message");

module.exports = {
    name: "audioTrackAdd",
    type: "player",
    once: false,
    execute(queue, track) {
        return sendQueueMessage(queue, `Track **${track.title}** queued.`);
    },
};
