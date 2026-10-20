const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
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
        let tempDir;
        try {
            await interaction.deferReply();

            const attachment = interaction.options.getAttachment("image");
            const bottomColor = interaction.options.getString("bottom_color");

            if (!attachment.contentType || !attachment.contentType.startsWith("image/")) {
                return await interaction.editReply("Please provide a valid image file.");
            }

            const solverDir = path.join(__dirname, "chess_solver");
            const scriptPath = path.join(solverDir, "src", "chess_solve.py");
            tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "debeliq-chess-"));
            const imagePath = path.join(tempDir, "chessboard.png");
            const solvedImagePath = path.join(tempDir, "solved_chessboard.png");

            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to download chess image: HTTP ${response.status}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            await fs.promises.writeFile(imagePath, buffer);

            const pythonArgs = [scriptPath, imagePath, "--output", solvedImagePath];

            if (bottomColor === "black") {
                pythonArgs.push("--invert_fen");
            }

            const env = {
                ...process.env,
                TF_CPP_MIN_LOG_LEVEL: "3",
                PYTHONUNBUFFERED: "1",
            };

            const pythonOutput = await new Promise((resolve, reject) => {
                const pythonProcess = spawn("python", pythonArgs, { cwd: solverDir, env });
                let stdout = "";
                let stderr = "";

                pythonProcess.stdout.on("data", (data) => {
                    stdout += data.toString();
                });
                pythonProcess.stderr.on("data", (data) => {
                    stderr += data.toString();
                });
                pythonProcess.on("error", reject);
                pythonProcess.on("close", (code) => {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        reject(
                            new Error(
                                `Chess solver exited with code ${code}.\n${stderr}\n${stdout}`
                            )
                        );
                    }
                });
            });

            try {
                if (!fs.existsSync(solvedImagePath)) {
                    throw new Error("Failed to generate the analyzed chess image.");
                }

                const fenResult = pythonOutput.match(/Predicted FEN: (.+)/)?.[1];
                const whiteMove = pythonOutput.match(/Best move for White: (.+)/)?.[1];
                const blackMove = pythonOutput.match(/Best move for Black: (.+)/)?.[1];
                const solvedAttachment = new AttachmentBuilder(solvedImagePath, { name: "analyzed_chess.png" });

                const responseEmbed = {
                    title: "Chess Position Analysis",
                    fields: [
                        { name: "FEN Notation", value: fenResult || "Not found", inline: false },
                        { name: "Best Move for White", value: whiteMove || "Not found", inline: true },
                        { name: "Best Move for Black", value: blackMove || "Not found", inline: true },
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
                throw new Error("Failed to prepare or send the chess analysis result.", {
                    cause: processingError,
                });
            }
        } catch (error) {
            console.error("Chess solver error:", error);

            const noChessboardFound =
                error instanceof Error && error.message.includes("NO_CHESSBOARD:");
            const userMessage = noChessboardFound
                ? "No chessboard was found in that image. Upload a clear image showing the complete board and try again."
                : "The chess solver encountered an error while processing your image. Please try again with a clear board image. If the problem continues, contact an administrator.";

            try {
                if (interaction.deferred) {
                    await interaction.editReply(userMessage);
                } else {
                    await interaction.reply({
                        content: userMessage,
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                console.error("Failed to respond to interaction:", replyError);
            }
        } finally {
            if (tempDir) {
                try {
                    await fs.promises.rm(tempDir, { recursive: true, force: true });
                } catch (cleanupError) {
                    console.error("Failed to clean up temporary chess solver files:", cleanupError);
                }
            }
        }
    },
};
