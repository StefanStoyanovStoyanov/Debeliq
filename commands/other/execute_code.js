const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const util = require("util");
const execAsync = util.promisify(require("child_process").exec);

function isDocker() {
    if (fs.existsSync("/.dockerenv")) return true;
    if (fs.existsSync("/proc/1/cgroup")) {
        const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
        return cgroup.includes("docker");
    }
    return false;
}

async function executeCommand(command, cleanupFiles = []) {
    try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
            return `Error: ${stderr}`;
        }
        return stdout;
    } catch (error) {
        return `Error: ${error.message}`;
    } finally {
        await Promise.all(
            cleanupFiles.map(async (file) => {
                if (fs.existsSync(file)) {
                    await fs.promises.unlink(file);
                }
            }),
        );
    }
}

async function executeJs(filePath) {
    return await executeCommand(`node ${filePath}`, [filePath]);
}

async function executePy(filePath) {
    return await executeCommand(`python ${filePath}`, [filePath]);
}

async function executeCpp(filePath, executablePath) {
    return await executeCommand(`g++ ${filePath} -o ${executablePath} && ${executablePath}`, [filePath, executablePath]);
}

async function executeC(filePath, executablePath) {
    return await executeCommand(`gcc ${filePath} -o ${executablePath} && ${executablePath}`, [filePath, executablePath]);
}

async function executeRs(filePath, executablePath) {
    return await executeCommand(`rustc ${filePath} -o ${executablePath} && ${executablePath}`, [filePath, executablePath]);
}

async function executeJava(filePath, classFile) {
    return await executeCommand(`javac ${filePath} && java temp`, [filePath, classFile]);
}

async function executeCode(code, language) {
    if (!isDocker()) return "Error: The code can only be executed inside a Docker container.";

    const fileExtensionMap = {
        js: "js",
        py: "py",
        cpp: "cpp",
        c: "c",
        rs: "rs",
        java: "java",
    };

    const fileExtension = fileExtensionMap[language];
    if (!fileExtension) return "Invalid language";

    const fileName = `temp.${fileExtension}`;
    const filePath = fileName;
    const executablePath = "temp.exe";
    const classFile = "temp.class";

    fs.writeFileSync(filePath, code);

    let result;
    switch (language) {
        case "js":
            result = await executeJs(filePath);
            break;
        case "py":
            result = await executePy(filePath);
            break;
        case "cpp":
            result = await executeCpp(filePath, executablePath);
            break;
        case "c":
            result = await executeC(filePath, executablePath);
            break;
        case "rs":
            result = await executeRs(filePath, executablePath);
            break;
        case "java":
            result = await executeJava(filePath, classFile);
            break;
        default:
            return "Invalid language";
    }

    if (!result.trim()) {
        result = "``` \n```";
    } else {
        result = "```" + result + "```";
    }

    return result;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("execute_code")
        .setDescription("Execute code in different languages")
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
