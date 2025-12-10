const { baseDiscordEvent } = require('../../lib/quest/handler/baseClientEvent.js');
const { EmbedBuilder } = require('../../lib/quest/handler/embedBuilder.js');
const { cooldown } = require('../../core/cooldown.js');
const config = require('../../config/config.js');
const { userSettingsRepo } = require('../../core/cache.js');
module.exports = class interactionChatInputHandler extends baseDiscordEvent {
    constructor() {
        super(...arguments);
        this.name = "interactionCreate";
        this.once = false;
    }
    async getUserSettings(id) {
        const cache = this.client.userSettings.get(id);
        if (cache)
            return cache;
        const userData = await userSettingsRepo.findOne({ where: { userId: id } });
        if (userData) {
            this.client.userSettings.tempSet(id, userData, this.client.clientMs("30m"));
            return userData;
        }
    }
    async executeEvent(interaction) {
        if (!interaction.isChatInputCommand() || !this.client.ready)
            return;
        const commandName = this.client.getCommandName(interaction);
        const command = this.client.slashCommands.get(commandName);
        if (!command)
            return;
        const guildConfig = interaction?.guildId && this.client.guildSettings.get(interaction.guildId) || null;
        const userConfig = await this.getUserSettings(interaction.user.id);
        const lang = userConfig?.lang ?? guildConfig?.lang ?? this?.client.config?.defaultLanguage ?? "en";
        const i18n = this.i18n.get(lang);
        const commandKey = command.getCommandKey();
        const replyInteraction = async (content, returnEphemeral, editReply = false) => {
            const replyied = interaction?.replied == true;
            const embed = new EmbedBuilder().setDescription(content);
            const flags = command.hasFlag("ephemeral") && !editReply || returnEphemeral ? ["Ephemeral"] : [];
            try {
                if (replyied) {
                    await interaction.editReply({ embeds: [embed], components: [] });
                }
                else {
                    await interaction.reply({ embeds: [embed], flags, components: [] });
                }
            }
            catch (err) {
                this.logger.error(`Failed to reply to interaction ${interaction.id}:`, err);
            }
        };
        // Handle disabled command
        const guildCommandConfig = guildConfig?.commands?.[commandKey];
        const disabled = guildCommandConfig?.enabled !== undefined
            ? !guildCommandConfig.enabled
            : !command.enabled;
        if (disabled)
            return replyInteraction(i18n.t("commandDisabled"), true);
        // Handle DM/guild restrictions
        if (command.hasFlag("onlyGuild") && !interaction.guildId && !command.hasFlag("onlyDm")) {
            return replyInteraction(i18n.t("guildOnly"), true);
        }
        if (command.hasFlag("onlyDm") && interaction.guild && !command.hasFlag("onlyGuild")) {
            return replyInteraction(i18n.t("dmOnly"), true);
        }
        // Check developer-only command
        if (command.hasFlag("devOnly") && !config?.developers?.includes(interaction.user.id)) {
            return replyInteraction(i18n.t("devOnly"), true);
        }
        // Handle cooldown
        const commandCd = command.getCooldown();
        const cdKey = command.hasFlag("userCooldown") ? `${commandKey}-${interaction.user.id}` : `${interaction.user.id}-${commandKey}-${interaction.guild?.id || "dm"}`;
        const dbCd = command.hasFlag("cooldownDatabase");
        const cd = await cooldown.get(cdKey, dbCd);
        if (cd) {
            const remaining = this.client.formatDuration(cd.getRemaining(), lang);
            return replyInteraction(i18n.t("cooldown", { time: remaining }), true);
        }
        if (command.hasFlag("ownerOnly") && !config?.developers?.includes(interaction.user.id)) {
            return replyInteraction(i18n.t("developerOnly"), true);
        }
        // Permissions & Role/channel restrictions (for guilds)
        if (interaction.guild && interaction.inCachedGuild()) {
            const { channel, guild, member, user } = interaction;
            if (!command.isAllowedGuild(guild.id))
                return replyInteraction(i18n.t("notAllowedGuild"), true);
            // 1. Owner-only command
            if (command.hasFlag("ownerOnly") && user.id !== guild.ownerId) {
                return replyInteraction(i18n.t("ownerOnly"), true);
            }
            // 2. Bot permissions check
            const botPerms = command.getBotPermissions();
            if (!guild.members.me.permissions.has(botPerms)) {
                return replyInteraction(i18n.t("noPermissionBot", {
                    permissions: command.bot_permissions.join(","),
                }), true);
            }
            // 3. Command configuration
            const cmdConfig = guildCommandConfig ?? {};
            const isOwner = user.id === guild.ownerId;
            const allowedRoles = cmdConfig.allowedRoles ?? command.allowedRoles ?? [];
            const disabledRoles = cmdConfig.disabledRoles ?? [];
            const allowedChannels = cmdConfig.allowedChannels ?? command.allowedChannels ?? [];
            const disabledChannels = cmdConfig.disabledChannels ?? [];
            const permissions = cmdConfig.allowedPermissions ?? command.permissions ?? [];
            const resolvedPerms = command.reslovePermissions(permissions);
            // 4. Channel restrictions
            if (disabledChannels.includes(channel.id) || (allowedChannels.length && !allowedChannels.includes(channel.id))) {
                return replyInteraction(i18n.t("commandDisabledInChannel", {
                    channel: channel.toString(),
                }), true);
            }
            // 5. Role restrictions
            const memberRoles = member.roles.cache;
            const hasAllowedRole = allowedRoles.some(role => memberRoles.has(role));
            const hasDisallowedRole = disabledRoles.some(role => memberRoles.has(role));
            if (hasDisallowedRole && !hasAllowedRole) {
                return replyInteraction(i18n.t("commandDisabledInRole"), true);
            }
            const hasPermission = permissions.length === 0 && allowedRoles.length > 0 ? hasAllowedRole || isOwner : member.permissions.has(resolvedPerms) || hasAllowedRole || isOwner;
            const permString = !permissions[0] ? `<@&${allowedRoles[0]}>` : permissions.map(e => `\`${e.trim()}\``).join(", ");
            if (!hasPermission) {
                return replyInteraction(i18n.t("noPermmisionUser", {
                    permissions: permString,
                }), true);
            }
        }
        // Execute the command
        try {
            cooldown.create(cdKey, commandCd, dbCd);
            if (!command.hasFlag("noReply")) {
                await interaction.deferReply({
                    flags: command.hasFlag("ephemeral") ? ["Ephemeral"] : [],
                });
            }
            await command.execute({
                interaction,
                i18n,
                client: this.client,
                lang,
                guildConfig,
            });
            this.logger.info(`Executed command ${commandName} for user ${interaction.user.tag} successfully.`);
        }
        catch (err) {
            this.logger.error(`Failed to execute command ${commandName} for interaction ${interaction.id}:`, err);
            replyInteraction(i18n.t("commandError"), true);
        }
    }
    }
