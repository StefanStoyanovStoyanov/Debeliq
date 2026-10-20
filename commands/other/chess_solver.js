const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chess_solver")
        .setDescription("Analyzes a chess position from an image and finds the best moves")
        .addAttachmentOption((option) =>
            option.setName("image").setDescription("A chess board image to analyze").setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("bottom_color")
                .setDescription("Which color is on the bottom of the board")
                .setRequired(true)
                .addChoices({ name: "White", value: "white" }, { name: "Black", value: "black" })
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const attachment = interaction.options.getAttachment("image");
            const bottomColor = interaction.options.getString("bottom_color");

            if (!attachment.contentType || !attachment.contentType.startsWith("image/")) {
                return await interaction.editReply("Please provide a valid image file.");
            }

            const solverDir = path.join(__dirname, "chess_solver");
            const imagePath = path.join(solverDir, "chessboard.png");
            const solvedImagePath = path.join(solverDir, "solved_chessboard.png");

            const response = await fetch(attachment.url);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(imagePath, buffer);

            const pythonArgs = [path.join(solverDir, "chess_solve.py"), imagePath];

            if (bottomColor === "black") {
                pythonArgs.push("--invert_fen");
            }

            const env = {
                ...process.env,
                TF_CPP_MIN_LOG_LEVEL: "3",
                PYTHONUNBUFFERED: "1",
            };

            const runPythonProcess = () => {
                return new Promise((resolve, reject) => {
                    const results = {
                        fenResult: "",
                        whiteMove: "",
                        blackMove: "",
                        success: false,
                        error: null,
                    };

                    const pythonProcess = spawn("python", pythonArgs, {
                        cwd: solverDir,
                        env: env,
                    });

                    let pythonOutput = "";

                    pythonProcess.stdout.on("data", (data) => {
                        const output = data.toString();
                        pythonOutput += output;

                        const fenMatch = output.match(/Predicted FEN: (.+)/);
                        if (fenMatch) {
                            results.fenResult = fenMatch[1];
                        }

                        const whiteMoveMatch = output.match(/Best move for White: (.+)/);
                        if (whiteMoveMatch) {
                            results.whiteMove = whiteMoveMatch[1];
                        }

                        const blackMoveMatch = output.match(/Best move for Black: (.+)/);
                        if (blackMoveMatch) {
                            results.blackMove = blackMoveMatch[1];
                        }
                    });

                    pythonProcess.stderr.on("data", (data) => {
                        const errorText = data.toString();
                        if (
                            !errorText.includes("tensorflow") &&
                            !errorText.includes("TensorFlow") &&
                            !errorText.includes("MLIR")
                        ) {
                            pythonOutput += `Error: ${errorText}`;
                            console.error(`Python Error: ${errorText}`);
                        }
                    });

                    pythonProcess.on("close", (code) => {
                        if (code === 0) {
                            results.success = true;
                            resolve(results);
                        } else {
                            results.error = `Process exited with code ${code}. Output: ${pythonOutput}`;
                            reject(results);
                        }
                    });

                    pythonProcess.on("error", (err) => {
                        results.error = `Process error: ${err.message}`;
                        reject(results);
                    });
                });
            };

            try {
                const results = await runPythonProcess();

                if (!fs.existsSync(solvedImagePath)) {
                    throw new Error("Failed to generate the analyzed chess image.");
                }

                const solvedAttachment = new AttachmentBuilder(solvedImagePath, { name: "analyzed_chess.png" });

                const responseEmbed = {
                    title: "Chess Position Analysis",
                    fields: [
                        { name: "FEN Notation", value: results.fenResult || "Not found", inline: false },
                        { name: "Best Move for White", value: results.whiteMove || "Not found", inline: true },
                        { name: "Best Move for Black", value: results.blackMove || "Not found", inline: true },
                        {
                            name: "Board Orientation",
                            value: `${bottomColor.charAt(0).toUpperCase() + bottomColor.slice(1)} pieces on bottom`,
                            inline: false,
                        },
                    ],
                    image: { url: "attachment://analyzed_chess.png" },
                    footer: { text: "Analyzed with Stockfish" },
                };

                await interaction.editReply({
                    content: null,
                    embeds: [responseEmbed],
                    files: [solvedAttachment],
                });
            } catch (processingError) {
                console.error("Processing error:", processingError);
                await interaction.editReply("An error occurred or no chessboard was detected in the image.");
            }
        } catch (error) {
            console.error("Chess solver error:", error);

            try {
                if (interaction.deferred) {
                    await interaction.editReply("An unexpected error occurred while processing your chess image.");
                } else {
                    await interaction.reply({
                        content: "An unexpected error occurred while processing your chess image.",
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                console.error("Failed to respond to interaction:", replyError);
            }
        }
    },
};
