module.exports = {
    name: "error",
    type: "player",
    once: false,
    execute(queue, error) {
        console.log(`General player error event: ${error.message}`);
        console.log(error);
    },
};
