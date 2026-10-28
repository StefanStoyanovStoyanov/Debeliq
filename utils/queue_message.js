async function sendQueueMessage(queue, content) {
    const channel = queue.metadata?.channel;
    if (!channel || typeof channel.send !== "function") {
        console.error("Could not send player notification because the queue has no message channel.");
        return;
    }

    try {
        await channel.send(content);
    } catch (error) {
        console.error("Failed to send player notification:", error);
    }
}

module.exports = { sendQueueMessage };
