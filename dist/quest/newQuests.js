"discord.js";
const { baseDiscordEvent } = require('../../lib/quest/handler/baseClientEvent.js');
const cron = require('node-cron');
const { User } = require('../../lib/quest/User.js');
const questsConfig = require('../../config/questsConfig.js');
const { getIdFromToken, isValidDiscordToken } = require('../../utils/quest/tokenUtils.js');
const { questRepo, userSettingsRepo } = require('../../core/cache.js');
const moment = require('moment-timezone');
const token = questsConfig?.notification?.token || "";
const isValidToken = isValidDiscordToken(token) && getIdFromToken(token) !== null;
const selfUser = isValidToken ? new User(token) : null;
module.exports = class readyEvent extends baseDiscordEvent {
    constructor() {
        super(...arguments);
        this.name = "clientReady";
        this.once = true;
    }
    /** Check if the quest has already been sent */
    async checkQuest(quest) {
        const questDb = await quest.getDb();
        return questDb.messageSent ? null : questDb;
    }
    /** Fetch guild and notification channel */
    async getGuildAndChannel() {
        const guild = this.client.guilds.cache.get(questsConfig.serverId)
            ?? await this.client.guilds.fetch(questsConfig.serverId).catch(() => null);
        if (!guild) {
            this.logger.warn("Bot is not in the specified server. Quest notifications disabled.");
            return null;
        }
        const channel = guild.channels.cache.get(questsConfig.notification.channel)
            ?? await guild.channels.fetch(questsConfig.notification.channel).catch(() => null);
        if (!channel?.isTextBased()) {
            this.logger.warn("Notification channel is invalid or not text-based. Quest notifications disabled.");
            return null;
        }
        return { guild, channel: channel };
    }
    /** Fetch members eligible for DM notifications */
    async fetchMembersToDM(guild) {
        const dmRoles = questsConfig?.notification?.dm?.dmRoles || [];
        if (!questsConfig.notification.dm?.enabled || dmRoles.length === 0)
            return null;
        const members = await guild.members.fetch().catch(() => null);
        if (!members)
            return null;
        const eligibleMembers = members.filter(member => !member.user.bot && dmRoles.some(r => member.roles.cache.has(r)));
        if (eligibleMembers.size === 0) {
            this.logger.warn("No members with the specified DM roles found. Disabling DM notifications.");
            return null;
        }
        return eligibleMembers;
    }
    /** Fetch user settings with caching */
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
    /** Send quest notification to channel and optionally via DM */
    async sendQuestNotification(quest, questDoc, channel, members) {
        const messageContent = await quest.notification_message();
        // Send to channel
        const channelMessage = await channel.send({ ...messageContent })
            .then(async () => {
            this.logger.info(`Sent notification for quest ${quest.id} in channel ${channel.id}`);
            questDoc.messageSent = true;
            await questRepo.save(questDoc);
            return channelMessage;
        }).catch(() => null);
        if (channelMessage) {
            channelMessage.crosspost().catch(() => null);
        }
        ;
        // Send via DM if applicable
        if (!members?.size)
            return;
        for (const member of members.values()) {
            const userSettings = await this.getUserSettings(member.id);
            const lang = userSettings?.lang ?? this?.client?.config?.defaultLanguage ?? "en";
            const i18n = this.i18n.get(lang);
            const userMessage = await quest.notification_message(i18n);
            member.send({ ...userMessage, content: `${member.toString()}` })
                .then(() => this.logger.info(`Sent DM for quest ${quest.id} to user ${member.user.tag}`))
                .catch(() => null);
        }
    }
    /** Main execution */
    async executeEvent() {
        if (!selfUser) {
            this.logger.warn("Invalid or missing quest notification token. Quest notifications will be disabled.");
            return;
        }
        // Cron: every 5 minutes
        cron.schedule("0 */5 * * * *", async () => {
            this.logger.info("Checking for new quests...");
            const guildAndChannel = await this.getGuildAndChannel();
            if (!guildAndChannel)
                return;
            const { guild, channel } = guildAndChannel;
            const members = await this.fetchMembersToDM(guild);
            const oldQuests = new Collection();
            selfUser.quests.forEach(q => oldQuests.set(q.id, q));
            const newQuests = await selfUser.fetchQuests();
            // Only quests that are new and started within last 6 hours
            const diff = newQuests.filter(q => !oldQuests.has(q.id) &&
                moment(q.startsAt).isAfter(moment().subtract(6, "hours")));
            if (!diff.size)
                return;
            const unSentQuests = await Promise.all(diff.map(q => this.checkQuest(q)));
            const filteredQuests = unSentQuests.filter(q => q !== null);
            for (const questDoc of filteredQuests) {
                const quest = newQuests.get(questDoc.questId);
                if (!quest)
                    continue;
                await this.sendQuestNotification(quest, questDoc, channel, members);
            }
            this.logger.info(`Quest check completed at ${new Date().toISOString()}`);
        });
    }
}
