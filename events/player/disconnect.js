module.exports = {
    name: "disconnect",
    type: "player",
    once: false,
    execute(queue) {
        queue.metadata.channel.send("Looks like my job here is done, leaving now.");
    },
};
