const { SlashCommandBuilder } = require("discord.js");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");

const CONTAINER_TIMEOUT_MS = 120_000;
const OUTPUT_LIMIT_BYTES = 4096;
const OUTPUT_LIMIT_CHARS = 1750;

const languages = {
    js: {
        image: "node:22-alpine",
        command: "cat > /tmp/main.js && timeout -s KILL 10s node /tmp/main.js",
    },
    py: {
        image: "python:3.13-alpine",
        command: "cat > /tmp/main.py && timeout -s KILL 10s python /tmp/main.py",
    },
    cpp: {
        image: "gcc:14",
        command: "cat > /tmp/main.cpp && timeout -s KILL 10s sh -c 'g++ /tmp/main.cpp -o /tmp/main && /tmp/main'",
    },
    c: {
        image: "gcc:14",
        command: "cat > /tmp/main.c && timeout -s KILL 10s sh -c 'gcc /tmp/main.c -o /tmp/main && /tmp/main'",
    },
    rs: {
        image: "rust:1-alpine",
        command: "cat > /tmp/main.rs && timeout -s KILL 10s sh -c 'rustc /tmp/main.rs -o /tmp/main && /tmp/main'",
    },
    java: {
        image: "eclipse-temurin:21-jdk-alpine",
        command: "cat > /tmp/temp.java && timeout -s KILL 10s sh -c 'javac /tmp/temp.java && java -cp /tmp temp'",
    },
};

function cleanupContainer(name) {
    return new Promise((resolve) => {
        let cleanup;
        let timer;
        let settled = false;
        let stderr = "";
        const finish = (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(error);
        };

        try {
            cleanup = spawn("docker", ["rm", "-f", name], {
                stdio: ["ignore", "ignore", "pipe"],
                windowsHide: true,
            });
            timer = setTimeout(() => {
                cleanup.kill();
                finish("Docker cleanup timed out.");
            }, 5000);
            cleanup.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });
            cleanup.once("error", (error) => finish(error.message));
            cleanup.once("close", (exitCode) => {
                if (exitCode === 0 || /no such container/i.test(stderr)) {
                    finish();
                } else {
                    finish(stderr.trim() || `docker rm exited with code ${exitCode}.`);
                }
            });
        } catch (error) {
            finish(error.message);
        }
    });
}

function executeInContainer(code, language) {
    const { image, command } = languages[language];
    const containerName = `debeliq-exec-${randomUUID()}`;
    const args = [
        "run",
        "--rm",
        "--init",
        "--pull=missing",
        "--quiet",
        "--name",
        containerName,
        "--interactive",
        "--network",
        "none",
        "--memory",
        "256m",
        "--memory-swap",
        "256m",
        "--cpus",
        "0.5",
        "--pids-limit",
        "64",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,exec,nosuid,nodev,size=64m,uid=1000,gid=1000",
        "--user",
        "1000:1000",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "--env",
        "HOME=/tmp",
        "--env",
        "PYTHONDONTWRITEBYTECODE=1",
        "--entrypoint",
        "sh",
        image,
        "-c",
        command,
    ];

    return new Promise((resolve) => {
        let child;
        let timeout;
        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let stdinError;
        let stopping = false;
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve(result);
        };

        const stop = async (message) => {
            if (stopping || settled) return;
            stopping = true;
            clearTimeout(timeout);
            child.kill();
            const cleanupError = await cleanupContainer(containerName);
            finish({ error: cleanupError ? `${message} Container cleanup failed: ${cleanupError}` : message });
        };

        try {
            child = spawn("docker", args, {
                stdio: ["pipe", "pipe", "pipe"],
                windowsHide: true,
            });
        } catch (error) {
            finish({ error: `Error: Could not start Docker: ${error.message}` });
            return;
        }

        const capture = (stream, chunk) => {
            outputBytes += chunk.length;
            if (outputBytes > OUTPUT_LIMIT_BYTES) {
                void stop("Error: Program output exceeded the limit.");
                return;
            }
            if (stream === "stdout") stdout += chunk.toString();
            else stderr += chunk.toString();
        };

        child.stdout.on("data", (chunk) => capture("stdout", chunk));
        child.stderr.on("data", (chunk) => capture("stderr", chunk));
        child.stdin.on("error", (error) => {
            stdinError = error;
        });

        child.once("error", (error) => {
            const message =
                error.code === "ENOENT"
                    ? "Error: Docker is required to run code in an isolated environment."
                    : `Error: Could not start Docker: ${error.message}`;
            finish({ error: message });
        });

        child.once("close", (exitCode, signal) => {
            if (stopping) return;
            if (exitCode !== 0) {
                const details = [stderr.trim(), stdout.trim()].filter(Boolean).join("\n");
                if (
                    /failed to connect to the docker api|cannot connect to the docker daemon|error during connect|is the docker daemon running/i.test(
                        details,
                    )
                ) {
                    finish({
                        error: `Error: Docker daemon is unavailable. Start Docker Desktop with its Linux container engine enabled, then try again.\n${details}`,
                    });
                    return;
                }
                if (/failed to resolve reference|manifest unknown|no such manifest/i.test(details)) {
                    finish({
                        error: `Error: Docker could not download the required image "${languages[language].image}". Check the image tag and Docker Hub connectivity.\n${details}`,
                    });
                    return;
                }
                finish({
                    error: `Error: Docker execution failed${exitCode === null ? ` (${signal})` : ` (exit code ${exitCode})`}.${details ? `\n${details}` : stdinError ? `\nFailed to send source code to Docker: ${stdinError.message}` : ""}`,
                });
                return;
            }
            finish({ output: [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join("\n") });
        });

        timeout = setTimeout(() => {
            void stop("Error: Docker execution timed out after 120 seconds.");
        }, CONTAINER_TIMEOUT_MS);
        child.stdin.end(code);
    });
}

async function executeCode(code, language) {
    if (!languages[language]) return "```\nInvalid language\n```";

    const result = await executeInContainer(code, language);
    if (result.error) return `\`\`\`\n${result.error.slice(0, OUTPUT_LIMIT_CHARS)}\n\`\`\``;
    const output = result.output;
    if (!output.trim()) return "```\n\n```";

    const truncated = output.length > OUTPUT_LIMIT_CHARS;
    const displayedOutput = truncated ? `${output.slice(0, OUTPUT_LIMIT_CHARS - 20)}\nOutput truncated.` : output;
    return `\`\`\`\n${displayedOutput}\n\`\`\``;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("execute_code")
        .setDescription("Execute code in different languages in an isolated container")
        .addStringOption((option) =>
            option
                .setName("language")
                .setDescription("Select the language")
                .addChoices(
                    { name: "JavaScript", value: "js" },
                    { name: "Python", value: "py" },
                    { name: "C++", value: "cpp" },
                    { name: "C", value: "c" },
                    { name: "Rust", value: "rs" },
                    { name: "Java", value: "java" },
                )
                .setRequired(true),
        )
        .addStringOption((option) => option.setName("code").setDescription("Paste the code here").setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const code = interaction.options.getString("code");
        const language = interaction.options.getString("language");

        const result = await executeCode(code, language);
        await interaction.followUp(result);
    },
};
