const { PermissionsBitField } = require('discord.js');
const { AppDataSource, client } = require('../../index.js');
const { i18n } = require('../../providers/i18n.js');
const ms = require('ms');
// كان: export type permissionList = keyof typeof PermissionFlagsBits
// في جافاسكربت لا يوجد types
// سنستخدم فقط أسماء الصلاحيات كما هي (strings)
const commandType = {
    slashCommand: "slashCommand",
    messageCommmand: "messageCommand",
    buttonCommand: "buttonCommand",
    menuCommand: "menuCommand",
};
const sharedCommandFlags = {
    onlyGuild: "Only works in guilds",
    onlyDm: "Only works in DMs",
    devOnly: "Only available for developers",
    cooldownDatabase: "Uses database-based cooldown system",
    ignorePermissions: "Does not reply if the user does not have permissions",
    ignoreCooldown: "Does not reply if the command is on cooldown",
    ownerOnly: "Only Server Owner can use this command",
    userCooldown: "Uses user-based cooldown system",
};
const messageCommandFlags = {
    deleteMessage: "Deletes the user's message after executing the command",
};
class messageCommand {
    constructor() {
        this.i18n = i18n;
        this.client = client;
        this.appDataSource = AppDataSource;
        this.type = commandType.messageCommmand;
        this.enabled = true;
        this.name = "";
        this.aliases = [];
        this.description = "";
        this.usage = "";
        this.examples = [];
        this.cooldown = 0;
        this.allowedRoles = [];
        this.allowedServers = [];
        this.allowedUsers = [];
        this.allowedChannels = [];
        this.minArgs = 0;
        this.maxArgs = -1;
        this.permissions = [];
        this.bot_permissions = [];
        this.flags = [];
    }
    reslovePermissions(permissions) {
        return PermissionsBitField.resolve(permissions);
    }
    getPermissions() {
        return this.permissions ? this.reslovePermissions(this.permissions) : BigInt(0);
    }
    getBotPermissions() {
        return this.bot_permissions ? this.reslovePermissions(this.bot_permissions) : BigInt(0);
    }
    hasFlag(flag) {
        return this.flags?.includes(flag);
    }
    getCooldown() {
        if (!this.cooldown)
            return 0;
        if (typeof this.cooldown === "string")
            return ms(this.cooldown) || 0;
        return this.cooldown;
    }
    greaterThanMinArgs(args) {
        return this.minArgs <= 0 || args >= this.minArgs;
    }
    lessThanMaxArgs(args) {
        return this.maxArgs < 0 || args <= this.maxArgs;
    }
    getUsage(prefix) {
        return this.usage.replace("{prefix}", prefix).replace("{command}", this.name).trim();
    }
    hasAlias(alias) {
        return this.aliases?.map(a => a.toLowerCase().trim()).includes(alias.toLowerCase());
    }
    isAllowedGuild(guildId) {
        return !this.allowedServers?.length || this.allowedServers.includes(guildId);
    }
    getCommandKey() {
        return `slashcommand-${this.name.toLowerCase().trim()}`;
    }
    async execute() {
        throw new Error(`Command ${this.name} does not have an execute() method.`);
    }
}
