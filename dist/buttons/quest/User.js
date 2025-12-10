const { EventEmitter } = require("events");
const { customAxiosWithProxy } = require("../../utils/quest/axiosInstance.js");
const { usersCache } = require("../../core/cache.js");
const { getIdFromToken, isValidDiscordToken } = require("../../utils/quest/tokenUtils.js");
const { i18n } = require("../../providers/i18n.js");
const config = require("../../config/config.js");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Collection,
    EmbedBuilder,
    StringSelectMenuBuilder,
    User: discordUser,
} = require("discord.js");

const moment = require("moment-timezone");
const client = require("../../providers/client.js");
const { formatDiscordTimestamp } = require("../../utils/tools.js");
const { Logger } = require("../../core/logger.js");
const questsConfig = require("../../config/questsConfig.js");
const { Quest } = require("./Quest.js");

class User extends EventEmitter {
    constructor(token, proxy) {
        if (!isValidDiscordToken(token) || !getIdFromToken(token))
            throw new Error("Invalid Discord Token");

        super();

        this.token = token;
        this.proxy = proxy || null;
        this._api = null;

        this.id = getIdFromToken(this.token);
        usersCache.set(this.id, this);

        this.i18n = i18n.get(config.defaultLanguage);

        this.destroyed = false;
        this.selectedQuest = null;
        this.process = null;
        this.started = false;
        this.logs = [];
        this.completed = false;
        this.stoped = false;

        this.quests = new Collection();

        this._onExit = null;
        this._onMessage = null;
    }

    setI18n(i18nInstance) {
        this.i18n = i18nInstance;
    }

    get api() {
        if (!this._api) {
            this._api = customAxiosWithProxy(this.token, this.proxy);
        }
        return this._api;
    }

    setQuest(quest) {
        if (this.started) return;
        this.selectedQuest = quest;
    }

    setProcess(process) {
        this.process = process;

        this._onExit = () => this.destroy();
        this._onMessage = (message) => this.emit("message", message);

        this.process.on("exit", this._onExit);
        this.process.on("message", this._onMessage);
    }

    clearProcessListeners() {
        if (!this.process) return;

        if (this._onExit) this.process.off("exit", this._onExit);
        if (this._onMessage) this.process.off("message", this._onMessage);

        this._onExit = undefined;
        this._onMessage = undefined;
    }

    send(message) {
        if (this.process?.send) {
            this.process.send(message);
        }
    }

    async sendCompleted() {
        const guild =
            client.guilds.cache.get(questsConfig.serverId) ||
            (await client.guilds
                .fetch(questsConfig.serverId)
                .catch(() => null));

        if (!guild) return;

        const channel =
            guild.channels.cache.get(questsConfig.completedQuestsChannel) ||
            (await guild.channels
                .fetch(questsConfig.completedQuestsChannel)
                .catch(() => null));

        if (!channel?.isTextBased()) return;

        const user =
            client.users.cache.get(this.id) ||
            (await client.users.fetch(this.id).catch(() => null));

        await this.selectedQuest.incrementQuestSolved();
        const solveCount = await this.selectedQuest.getSolvedCount();

        const msg = this.genreate_message();
        const embed = msg.embeds?.[0];

        const completedEmbed = new EmbedBuilder()
            .setTitle("Quest Completed")
            .setColor(embed.data.color)
            .setDescription(
                `- **Username:** \`${user ? user.tag : "-"}\`\n` +
                `- **User ID:** \`${this.id}\`\n` +
                `- **Quest:** \`${this.selectedQuest.id}\`\n` +
                `- **Solve Count:** \`${solveCount.toLocaleString()}\``
            );

        await channel.send({
            embeds: [completedEmbed, embed],
        });
    }

    async start() {
        if (!this.selectedQuest || !this.process) return false;

        const quest = this.selectedQuest;
        if (!quest || this.started) return false;

        const solveMethod = quest.solveMethod;

        this.started = true;
        this.quests.clear();
        this.quests.set(this.selectedQuest.id, this.selectedQuest);

        this.send({
            type: "start",
            data: {
                token: this.token,
                questId: quest.id,
                proxy: this.proxy,
                method: solveMethod.id,
                current: solveMethod.current,
                target: solveMethod.target,
            },
        });
    }

    async stop(immediate = false) {
        if (this.stoped) return;

        this.stoped = true;

        if (this.process) {
            this.send({
                type: "kill",
                target: this.id,
            });
        }

        this.emit("stopped", true);

        if (immediate) {
            this.destroy();
        } else {
            setTimeout(() => this.destroy(), 500);
        }
    }

    async updateProgress(progress, completed) {
        if (this.completed) return;

        const quest = this.selectedQuest;
        if (!quest) return;

        const methodId = quest.solveMethod?.id;
        if (!methodId) return;

        let current = quest.data?.user_status?.progress?.[methodId];

        if (!current) {
            await this.fetchQuests();
            current = quest.data?.user_status?.progress?.[methodId];
            if (!current) return;
        }

        current.value = progress;

        if (completed) {
            this.completed = true;
            current.completed_at = new Date().toISOString();
        }

        quest.data.user_status.progress[methodId] = current;
    }

    async fetchQuests() {
        try {
            const { data } = await this.api.get("/quests/@me");

            if (!Array.isArray(data?.quests)) return null;

            this.quests.clear();

            for (const questData of data.quests) {
                const quest = new Quest(questData, this);
                this.quests.set(quest.id, quest);
            }

            for (const [id, quest] of this.quests) {
                const expiresAt = quest.data?.config?.expires_at;
                if (!expiresAt) continue;

                if (!moment(expiresAt).isAfter(moment())) {
                    this.quests.delete(id);
                }
            }

            if (this.selectedQuest) {
                this.selectedQuest = this.quests.get(this.selectedQuest.id);
            }

            if (this.started && this.selectedQuest) {
                this.quests.clear();
                this.quests.set(this.selectedQuest.id, this.selectedQuest);
            }

            return this.quests.size > 0 ? this.quests : null;
        } catch (err) {
            Logger.error("Error fetching quests:", err);
            return null;
        }
    }

    ConsoleString() {
        let lines = [...new Set(this.logs.filter((l) => l.trim()))];

        lines = lines.map((l, i) => `[${i + 1}] ${l}`);

        if (lines.length > 15) {
            lines = lines.slice(-15);
        }

        let output = questsConfig.logStrings.join("\n");
        lines.forEach((l) => (output += `${l}\n`));

        return output;
    }

    genreate_message() {
        const i18n = this.i18n;
        const quest = this.selectedQuest;
        const button = quest.button;
        const files = [];
        const emojiList = client.emojisList;

        let rewards = quest.rewards
            .map((reward) => {
                let txt = reward.messages.name;
                const forWord = i18n.t("for");
                const months = i18n.t("months");
                const emoji = emojiList?.[reward.type];

                if ([1, 3].includes(reward.expiration_mode)) {
                    txt += ` ${forWord} ${moment(reward.expires_at).diff(
                        moment(quest.startsAt),
                        "months"
                    )} ${months}`;
                }

                if (emoji) txt += ` ${emoji}`;

                return txt;
            })
            .join("\n- ");

        rewards = `- **${rewards}**`;

        const progress = quest.formatProgress();
        const tasks = quest.formatTasks();

        const enrolled = quest?.data.user_status?.enrolled_at;
        const expiresAt = quest?.data.config?.expires_at;
        const image = quest.image;

        const embed = new EmbedBuilder()
            .addFields(
                {
                    name: `${i18n.t("message.gameName")}:`,
                    value: quest.data.config.messages.game_title,
                    inline: true,
                },
                {
                    name: `${i18n.t("message.publisher")}:`,
                    value: quest.data.config.messages.game_publisher,
                    inline: true,
                },
                {
                    name: `${i18n.t("message.questName")}:`,
                    value: quest.data.config.messages.quest_name,
                    inline: true,
                },
                {
                    name: `${i18n.t("message.enrolledAt")}:`,
                    value: enrolled
                        ? formatDiscordTimestamp(
                              new Date(enrolled).getTime(),
                              "Date"
                          )
                        : "-",
                    inline: true,
                },
                {
                    name: `${i18n.t("message.expiresAt")}:`,
                    value: expiresAt
                        ? formatDiscordTimestamp(
                              new Date(expiresAt).getTime(),
                              "Date"
                          )
                        : "-",
                    inline: true,
                },
                {
                    name: `${i18n.t("message.progress")}:`,
                    value: progress,
                    inline: true,
                }
            )
            .setColor(`#${quest.data.config.colors.primary.replace("#", "")}`)
            .setImage(quest.assets.hero)
            .setTimestamp(moment(quest.startsAt).toDate())
            .setFooter({
                text: quest.data.config.application.name,
                iconURL: image || undefined,
            })
            .setDescription(
                `## ${i18n.t("message.rewards")}:\n${rewards}\n\n` +
                `## ${i18n.t("message.tasks")}:\n${tasks}`
            );

        if (image) embed.setThumbnail(image);

        const menu = new StringSelectMenuBuilder()
            .setCustomId("selectBadge")
            .setPlaceholder(i18n.t("badge.selectPlaceholder"))
            .setMinValues(1)
            .setMaxValues(1)
            .setDisabled(this.started || this.stoped);

        this.quests.forEach((q) => {
            menu.addOptions({
                label: q.displayLabel.trim().slice(0, 100),
                value: q.id,
                default: q.id === this.selectedQuest.id,
                description: q.rewardLabel.trim().slice(0, 100),
                emoji: q.emoji,
            });
        });

        let embeds = [embed];

        if (this.started) {
            const logEmbed = new EmbedBuilder()
                .setTitle(i18n.t("badge.logs"))
                .setDescription(
                    `\`\`\`prolog\n======================================================\n${this.ConsoleString()}\`\`\``
                )
                .setColor(embed.data.color);

            embeds.push(logEmbed);
        }

        if (this.started && this.completed) {
            const warning = new EmbedBuilder()
                .setColor(embed.data.color)
                .setDescription(`-# ${i18n.t("badge.pleaseChangeYourPassword")}`);

            embeds.push(warning);
        }

        const refreshButton = new ButtonBuilder()
            .setCustomId("refresh")
            .setEmoji("🔄")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.started || this.stoped);

        const questLink = new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setEmoji("🔗")
            .setLabel(i18n.t("badge.ViewQuest"))
            .setURL(`https://discord.com/quests/${quest.id}`);

        const buttonsRow = new ActionRowBuilder().addComponents(
            button,
            refreshButton,
            questLink
        );

        for (const btn of questsConfig.buttons) {
            let emoji = btn.emoji;

            if (typeof emoji === "function") emoji = emoji(client);

            const builder = new ButtonBuilder().setStyle(ButtonStyle.Link);

            if (btn.text) builder.setLabel(btn.text);
            if (btn.url) builder.setURL(btn.url);
            if (emoji) builder.setEmoji(emoji);

            buttonsRow.addComponents(builder);
        }

        return {
            files,
            embeds,
            components: [
                new ActionRowBuilder().addComponents(menu),
                buttonsRow,
            ],
        };
    }

    destroy() {
        this.destroyed = true;

        usersCache.delete(this.id);

        this.quests.forEach((q) => q.destroy?.());
        this.quests.clear();

        this.quests.set(this.selectedQuest?.id, this.selectedQuest);

        this.process = null;
        this.proxy = null;

        this.logs = this.logs.slice(-5);

        this.removeAllListeners();
        this.clearProcessListeners();
    }
}

module.exports = { User };
