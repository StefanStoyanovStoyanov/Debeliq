const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("chess_solver")
        .setDescription("Analyzes a chess position from an image and finds the best moves.")
        .addAttachmentOption((option) =>
            option.setName("image").setDescription("A chessboard image to analyze.").setRequired(true),
        ),

    async execute(interaction) {
        let tempDir;
        try {
            await interaction.deferReply();

            const attachment = interaction.options.getAttachment("image");
            const isImage =
                attachment?.contentType?.startsWith("image/") ||
                /\.(png|jpe?g|webp|bmp|gif)$/i.test(attachment?.name || "");
            if (!isImage) {
                return await interaction.editReply("Please provide a valid image file.");
            }

            const solverDir =
                process.env.CHESS_SOLVER_DIR || path.resolve(__dirname, "../../../Chess-Solver");
            const scriptPath = path.join(solverDir, "src", "chess_solve.py");
            const requiredFiles = [
                scriptPath,
                path.join(solverDir, "models", "image_to_fen_model.pb"),
                path.join(solverDir, "models", "stockfish.exe"),
            ];
            if (requiredFiles.some((filePath) => !fs.existsSync(filePath))) {
                throw new Error("CHESS_SOLVER_NOT_INSTALLED");
            }

            tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "debeliq-chess-"));
            const imagePath = path.join(tempDir, "input-image");
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to download chess image: HTTP ${response.status}`);
            }
            await fs.promises.writeFile(imagePath, Buffer.from(await response.arrayBuffer()));

            const env = {
                ...process.env,
                TF_CPP_MIN_LOG_LEVEL: "3",
                PYTHONUNBUFFERED: "1",
            };
            const pythonResult = await new Promise((resolve, reject) => {
                const pythonProcess = spawn(
                    process.env.PYTHON_EXECUTABLE || "python",
                    [scriptPath, "--image", imagePath, "--output-dir", tempDir],
                    { cwd: solverDir, env },
                );
                let stdout = "";
                let stderr = "";

                pythonProcess.stdout.on("data", (data) => {
                    stdout += data.toString();
                });
                pythonProcess.stderr.on("data", (data) => {
                    stderr += data.toString();
                });
                pythonProcess.on("error", reject);
                pythonProcess.on("close", (code) => resolve({ code, stdout, stderr }));
            });

            const solvedPaths = (await fs.promises.readdir(tempDir))
                .filter((name) => /^solved_chessboard_(white|black)_bottom\.png$/i.test(name))
                .sort()
                .map((name) => path.join(tempDir, name));

            if (solvedPaths.length === 0) {
                const output = `${pythonResult.stderr}\n${pythonResult.stdout}`;
                if (/No module named|ModuleNotFoundError/.test(output)) {
                    throw new Error("CHESS_SOLVER_DEPENDENCIES_MISSING");
                }
                const reason = /no legal moves/i.test(output)
                    ? "The detected position has no legal moves."
                    : "The image could not be read as a valid chess position.";
                throw new Error(`CHESS_SOLVER_NO_OUTPUT: ${reason}`);
            }

            const files = solvedPaths.map((filePath) => {
                const name = path.basename(filePath);
                return { name, attachment: new AttachmentBuilder(filePath, { name }) };
            });
            const embeds = files.map(({ name }) => {
                const orientation = name.includes("black_bottom") ? "Black on bottom" : "White on bottom";
                return {
                    title: `Solved board - ${orientation}`,
                    image: { url: `attachment://${name}` },
                };
            });
            const partialFailure = pythonResult.code !== 0;

            await interaction.editReply({
                content: partialFailure
                    ? "Some solved board images are attached, but the solver could not analyze every orientation. The position may have no legal moves or the image may be unclear."
                    : "Solved chessboard image(s):",
                embeds,
                files: files.map(({ attachment }) => attachment),
            });
        } catch (error) {
            console.error("Chess solver error:", error);

            let userMessage =
                "There was a problem with the image or the detected position has no legal moves. Upload a clear image of the full board and try again.";
            if (error instanceof Error && error.message === "CHESS_SOLVER_NOT_INSTALLED") {
                userMessage = "Chess Solver is not installed on this server.";
            } else if (error instanceof Error && error.message.startsWith("CHESS_SOLVER_NO_OUTPUT:")) {
                userMessage = `${error.message.slice("CHESS_SOLVER_NO_OUTPUT:".length).trim()} Upload a clear image of the full board and try again.`;
            } else if (error instanceof Error && error.message === "CHESS_SOLVER_DEPENDENCIES_MISSING") {
                userMessage = "Chess Solver is installed, but its Python dependencies are missing.";
            } else if (error?.code === "ENOENT") {
                userMessage = "Chess Solver could not start because Python is not installed or is not available.";
            }

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(userMessage);
                } else {
                    await interaction.reply({ content: userMessage, ephemeral: true });
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
