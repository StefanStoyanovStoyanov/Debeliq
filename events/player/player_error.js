module.exports = {
    name: "playerError",
    type: "player",
    once: false,
    execute(queue, error) {
        console.log(`Player error event: ${error.message}`);
        console.log(error);
    },
};
