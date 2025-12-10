const { ChatInputCommandInteraction } = require("discord.js");
const { SlashCommand, slashCommandFlags } = require("../../lib/handler/slashCommand.js");
const { CustomClient } = require("../../core/customClient.js");
const { permissionList } = require("../../lib/handler/messageCommand.js");
const { I18nInstance } = require("../../core/i18n.js");
const { ChildManager } = require("../../core/ChildManager.js");
const { EmbedBuilder } = require("../../lib/handler/embedBuilder.js");
const numeral = require("numeral");
const pidusage = require("pidusage");
const { usersCache } = require("../../core/cache.js");

module.exports = class setLang extends SlashCommand {
    constructor() {
        super();
        this.name = "usage";
        this.description = "Show the bot's process usage";
        this.options = [];
        this.cooldown = "5s";
        this.allowedRoles = [];
        this.allowedServers = [];
        this.allowedUsers = [];
        this.allowedChannels = [];
        this.permissions = [];
        this.bot_permissions = [];
        this.flags = ["devOnly", "ephemeral", "onlyDm", "onlyGuild"];
    }

    async execute({ interaction, client, i18n, lang }) {
        const ids = [process.pid, ...ChildManager.pids];

        const ram = await Promise.all(ids.map(e => getProcessUsage(e)));
        const totalRam = ram.reduce((acc, curr) => acc + curr.memory, 0);
        const totalCpu = ram.reduce((acc, curr) => acc + curr.cpu, 0);

        let text = ``;

        const usersCacheSize = usersCache.size;
        const questsCacheSize = usersCache.reduce((acc, curr) => acc + curr.quests.size, 0);

        text += `- **Total Users Cache:** \`${usersCacheSize}\`\n- **Total Quests Cache:** \`${questsCacheSize}\`\n`;
        text += `- **${i18n.t("usage.totalRam")}:** \`${totalRam.toFixed(2)} MB\`\n- **${i18n.t("usage.totalCpu")}**: \`${totalCpu.toFixed(2)}%\`\n- **${i18n.t("usage.currentSolvers")}:** \`${ChildManager.TotalUsage}\`\n`;
        text += `- **${i18n.t("usage.childProcess")}**: \`${ram.length - 1}\`\n`;
        text += `# **${i18n.t("usage.processUsage")}**:\n\n`;

        ram.forEach((e, i) => {
            text += `-# - **${i18n.t("usage.PID")}:** \`${ids[i]}\` - **${i18n.t("usage.ram")}:** \`${e.memory.toFixed(2)} ${i18n.t("usage.mb")}\` - **${i18n.t("usage.cpu")}:** \`${e.cpu.toFixed(2)}%\` ${ids[i] === process.pid ? `(${i18n.t("usage.main")})` : ""}\n`;
        });

        interaction.editReply({
            embeds: [new EmbedBuilder().setDescription(text).setColor("Random")]
        });
    }
};

async function getProcessUsage(pid) {
    try {
        const stats = await pidusage(pid);
        return {
            cpu: stats.cpu,
            memory: numeral(stats.memory / 1024 / 1024).value()
        };
    } catch (error) {
        console.error("Error:", error);
        return { cpu: 0, memory: 0 };
    }
}
