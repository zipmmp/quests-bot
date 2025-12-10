// src/lib/handler/slashCommand.js
const { InteractionContextType, PermissionsBitField } = require('discord.js');
const { AppDataSource, client } = require('../../index.js');
const ms = require('ms');
const { commandType } = require('./messageCommand.js');
const { i18n } = require('../../providers/i18n.js');
/**
 * Slash command flags definitions
 */
const slashCommandFlags = {
    noReply: "Does not reply to the interaction",
    ephemeral: "Reply is ephemeral (only visible to the user)",
    allowOverride: "Allows the command permission to be overridden with guild settings",
    nsfw: "Command can be used in NSFW channels",
};
/**
 * @typedef {SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder} SlashCommandOption
 * @typedef {keyof typeof slashCommandFlags | SharedCommandFlagKeys} SlashCommandFlag
 * @typedef {keyof typeof PermissionFlagsBits} PermissionList
 * @typedef {new () => SlashCommand} SlashCommandConstructor
 */
class SlashCommand {
    constructor() {
        /** @type {I18nManager} */
        this.i18n = i18n;
        /** @type {CustomClient} */
        this.client = client;
        this.appDataSource = AppDataSource;
        this.type = commandType.slashCommand;
        this.enabled = true;
        this.name = this.constructor.name.toLowerCase();
        this.description = "";
        this.options = [];
        this.cooldown = 0;
        this.allowedRoles = [];
        this.allowedServers = [];
        this.allowedUsers = [];
        this.allowedChannels = [];
        this.permissions = [];
        this.bot_permissions = [];
        this.flags = [];
        this.isSubCommand = false;
        this.isConfigFile = false;
        this.subCommand = "";
        this.subCommandGroupName = "";
    }
    getName() {
        let name = this.name;
        if (this.isSubCommand && this.subCommandGroupName) {
            name += `-${this.subCommandGroupName}`;
        }
        if (this.isSubCommand && this.subCommand) {
            name += `-${this.subCommand}`;
        }
        return name.trim().toLowerCase();
    }
    isNSFW() {
        return this.flags.includes("nsfw");
    }
    resolvePermissions(permissions) {
        return PermissionsBitField.resolve(permissions);
    }
    getPermissions() {
        return this.permissions ? this.resolvePermissions(this.permissions) : BigInt(0);
    }
    getBotPermissions() {
        return this.bot_permissions ? this.resolvePermissions(this.bot_permissions) : BigInt(0);
    }
    hasFlag(flag) {
        return this.flags.includes(flag) === true;
    }
    getContexts() {
        const context = [];
        const contextFlags = ["onlyDm", "onlyGuild", "devOnly"];
        const contextCmdFlags = this.flags.filter(flag => contextFlags.includes(flag));
        if (this.hasFlag("onlyDm"))
            context.push(InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
        if (this.hasFlag("onlyGuild"))
            context.push(InteractionContextType.Guild);
        if ((contextCmdFlags || []).length === 0)
            context.push(InteractionContextType.Guild);
        return context;
    }
    getCooldown() {
        if (!this.cooldown)
            return 0;
        if (typeof this.cooldown === "string") {
            const time = ms(this.cooldown);
            return time || 0;
        }
        return this.cooldown;
    }
    isAllowedGuild(guildId) {
        if (this.allowedServers && this.allowedServers.length > 0) {
            return this.allowedServers.includes(guildId);
        }
        return true;
    }
    getCommandKey() {
        return `slashcommand-${this.getName()}`;
    }
    /**
     * @abstract
     * @param {Object} options
     * @param {ChatInputCommandInteraction} options.interaction
     * @param {CustomClient} options.client
     * @param {import("../../core/i18n.js").I18nInstance} options.i18n
     * @param {string} options.lang
     * @param {GuildDocument | null} options.guildConfig
     * @returns {Promise<any>}
     */
    async execute({ interaction, client, i18n, lang, guildConfig }) {
        throw new Error(`Command ${this.name} must implement execute()`);
    }
}
