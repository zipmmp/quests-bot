const { ApplicationCommandType } = require('discord.js');
const { baseDiscordEvent } = require('../lib/quest/handler/baseClientEvent.js');
const GuildDocument = require('../entities/guildSettings.js');
const { delay } = require('../utils/tools.js');
const Cooldown = require('../entities/cooldown.js');
const { cooldown } = require('../core/cooldown.js');
const { AppDataSource } = require('../index.js');
const { imageRepo } = require('../core/cache.js');
const { Logger } = require('../core/logger.js');
module.exports = class readyEvent extends baseDiscordEvent {
    constructor() {
        super(...arguments);
        this.name = "clientReady";
        this.once = true;
    }
    async executeEvent() {
        while (!AppDataSource.isInitialized) {
            await delay(500);
        }
        const slashCommands = this.client.slashCommands.filter(e => e.name && e.description && (!e.isSubCommand || e.isSubCommand && e.isConfigFile) && e.enabled);
        const commands = slashCommands.map(e => ({ name: e.name, description: e.description, options: e?.options || [], contexts: e.getContexts(), nsfw: e.isNSFW(), permissions: e.getPermissions(), type: ApplicationCommandType.ChatInput, }));
        this.client.application.commands.set(commands).catch(err => {
            this.logger.error("Failed to set slash commands:", err);
        }).then(() => {
            this.logger.info(`Set ${commands.length} slash commands.`);
        });
        this.logger.info(`Client is ready! Logged in as ${this.client.user.id}`);
        const guilds = await AppDataSource.getRepo(GuildDocument).find();
        guilds.forEach(guild => {
            this.client.guildSettings.set(guild.guildId, guild);
            this.logger.info(`Loaded settings for guild: ${guild.guildId}`);
        });
        this.client.user.setStatus("idle");
        this.client.updateActivity();
        setInterval(() => {
            this.client.updateActivity();
        }, 30_000);
        const images = await imageRepo.find();
        images.forEach(img => {
            this.client.images.set(img.key, img);
        });
        Logger.info(`Images loaded: ${this.client.images.size}`);
        this.client.ready = true;
        const cooldownsRepo = AppDataSource.getRepo(Cooldown);
        setInterval(async () => {
            const expiredCooldowns = await cooldownsRepo.find({
                where: {
                    expireDate: this.appDataSource.smartLessThan(new Date())
                }
            });
            expiredCooldowns.forEach(async (cd) => {
                const key = cd.cdKey;
                const cooldownInstance = await cooldown.get(key);
                if (cooldownInstance) {
                    cooldownInstance.kill();
                }
                // @ts-ignore
                else
                    await cooldownsRepo.delete(cd.id);
                this.logger.info(`Removed expired cooldown: ${key}`);
            });
        }, this.client.clientMs("30s"));
    }
}
