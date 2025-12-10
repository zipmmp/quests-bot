const { PermissionsBitField } = require('discord.js');
const { AppDataSource, client } = require('../../index.js');
const ms = require('ms');
const { commandType } = require('./messageCommand.js');
const { i18n } = require('../../providers/i18n.js');
// تعريف الـ flags
const slashCommandFlags = {
    noReply: "Does not reply to the interaction",
    ephemeral: "Reply is ephemeral (only visible to the user)",
    allowOverride: "Allows the command permission to be overridden with guild settings",
    nsfw: "Command can be used in NSFW channels",
};
// الكلاس الأساسي للـ button command
class buttonCommand {
    constructor() {
        this.i18n = i18n;
        this.client = client;
        this.appDataSource = AppDataSource;
        this.type = commandType.buttonCommand;
        this.enabled = true;
        this.name = "";
        this.description = "";
        this.cooldown = 0;
        this.allowedRoles = [];
        this.allowedServers = [];
        this.allowedUsers = [];
        this.allowedChannels = [];
        this.permissions = [];
        this.bot_permissions = [];
        this.flags = [];
        this.filter = null;
    }
    passFilter(interaction) {
        if (!this.filter)
            return false; // إذا لم يوجد فلتر
        return this.filter(interaction);
    }
    getName() {
        return this.name.trim().toLowerCase();
    }
    isNSFW() {
        return this.flags.includes("nsfw");
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
        return this.flags.includes(flag) === true;
    }
    getCooldown() {
        if (!this.cooldown)
            return 0;
        if (typeof this.cooldown === "string") {
            const time = ms(this.cooldown);
            return time || 0;
        }
        if (typeof this.cooldown === "number") {
            return this.cooldown;
        }
        return 0;
    }
    isAllowedGuild(guildId) {
        if (this.allowedServers && this.allowedServers.length > 0) {
            return this.allowedServers.includes(guildId);
        }
        return true;
    }
    getCommandKey() {
        return `button-${this.getName()}`;
    }
    // هذه الدالة يجب أن تُكتب في كل كلاس يرث من هذا الكلاس
    async execute({ interaction, client, i18n, lang, guildConfig }) {
        throw new Error("Method 'execute' must be implemented.");
    }
}
