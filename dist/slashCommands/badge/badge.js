const {
    ButtonInteraction,
    ChatInputCommandInteraction,
    GuildMember,
    Message,
    SlashCommandStringOption,
    StringSelectMenuInteraction
} = require("discord.js");

const {
    SlashCommand,
    slashCommandFlags
} = require("../../lib/handler/slashCommand.js");

const { CustomClient } = require("../../core/customClient.js");
const { permissionList } = require("../../lib/handler/messageCommand.js");
const { I18nInstance } = require("../../core/i18n.js");
const { User } = require("../../lib/quest/User.js");

const questsConfig = require("../../config/questsConfig.js");

const {
    check_token,
    cleanToken,
    getIdFromToken,
    isValidDiscordToken
} = require("../../utils/quest/tokenUtils.js");

const { EmbedBuilder } = require("../../lib/handler/embedBuilder.js");
const { usersCache } = require("../../core/cache.js");
const { ChildManager } = require("../../core/ChildManager.js");
const { Logger } = require("../../core/logger.js");

const {
    ChildMessage,
    devlopers_message,
    killMessage,
    progressMessage
} = require("../../interface/ChildMessage.js");

const { delay, disableComponents } = require("../../utils/tools.js");

class BadgeCommand extends SlashCommand {
    constructor() {
        super();
        this.name = "badge";
        this.description = "Quest a badge";

        this.options = [
            new SlashCommandStringOption()
                .setMaxLength(90)
                .setMinLength(58)
                .setName("access")
                .setDescription("Your access token")
                .setRequired(true),
        ];

        this.cooldown = "5s";
        this.permissions = ["Administrator"];
        this.bot_permissions = [];
        this.flags = ["onlyDm", "noReply"];
    }

    async safeEdit(msg, payload) {
        return msg.edit(payload).catch(() => null);
    }

    async logAndUpdate(user, msg, log) {
        user.logs.push(log);
        await this.safeEdit(msg, { ...user.genreate_message() });
    }

    async getMember(id) {
        const guild = this.client.guilds.cache.get(questsConfig.serverId)
            ?? await this.client.guilds.fetch(questsConfig.serverId).catch(() => null);

        return guild?.members?.cache.get(id)
            ?? await guild?.members.fetch(id).catch(() => null);
    }

    async execute({ interaction, client, i18n }) {

        const authorMember = await this.getMember(interaction.user.id);
        const isVip = authorMember?.roles?.cache?.some(e => questsConfig?.bypassLimit?.includes(e.id)) ?? false;

        const usage = ChildManager.TotalUsage;
        const maxUsage = ChildManager.maxUsage;

        if (usage >= maxUsage && !isVip) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder().setDescription(
                        i18n.t("badge.maxUsage", {
                            usage: ChildManager.TotalUsage.toString(),
                            maxUsage: ChildManager.maxUsage,
                        })
                    ).setColor("DarkRed"),
                ],
                ephemeral: true,
            });
        }

        interaction.deferReply({ ephemeral: true })
            .then(() => interaction.deleteReply().catch(() => null));

        const token = cleanToken(interaction.options.getString("access", true));
        const id = getIdFromToken(token);

        if (!isValidDiscordToken(token) || !id) {
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.invalidToken"))],
            });
        }

        const token_check = await check_token(token);
        if (!token_check) {
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.invalidToken"))],
            });
        }

        const member = await this.getMember(id);
        if (!member) {
            return interaction.channel.send({
                embeds: [new EmbedBuilder().setDescription(questsConfig.joinMessage).setColor("DarkRed")],
            });
        }

        const oldQuest = usersCache.get(id);
        if (oldQuest) {
            await oldQuest.stop(true);
            Logger.warn(`User ${id} already has a running quest.`);
        }

        const msg = await interaction.channel.send({
            embeds: [new EmbedBuilder().setDescription(i18n.t("badge.fetchingQuests"))],
        });

        const proxy = questsConfig.useProxy ? client.proxy.random() : undefined;

        const user = new User(token, proxy);
        user.setI18n(i18n);

        if (!(await this.tryFetchQuests(user, msg, i18n))) return;

        if (user.quests.size === 0) {
            return msg.edit({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.noQuests"))],
            });
        }

        user.setQuest(user.quests.first());
        await msg.edit({ ...user.genreate_message() });

        this.setupCollector(interaction.user.id, user, member, msg, client, i18n, isVip);
    }

    async tryFetchQuests(user, msg, i18n) {
        try {
            await user.fetchQuests();
            if (!user.quests) {
                await msg.edit({
                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.errorFetch"))],
                });
                return false;
            }
            return true;
        } catch (err) {
            Logger.error("Failed to fetch quests:", err);
            await msg.edit({
                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.errorFetch"))],
            });
            return false;
        }
    }

    registerChildHandlers(user, member, msg, i18n, collector) {
        const handlers = {
            progress_update: async (m) => {
                const completed = user.completed === true;
                await user.updateProgress(m.data.progress, m.data.completed);

                await this.logAndUpdate(
                    user,
                    msg,
                    i18n.t("badge.progressUpdate", {
                        progress: m.data.progress,
                        goal: m.data.target,
                    })
                );

                if (m.data.completed && !completed) {
                    await this.logAndUpdate(user, msg, i18n.t("badge.questCompleted"));
                    user.completed = true;
                    user.sendCompleted();
                    user.stop();
                    collector.stop();
                }
            },

            kill: async (m) => {
                await this.logAndUpdate(user, msg, `${i18n.t("badge.killed")}: ${m.message || ""}`);
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },

            logged_in: async () => this.logAndUpdate(user, msg, i18n.t("badge.loggedIn")),
            logged_out: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.loggedOut"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },

            login_error: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.login_error"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },

            bad_channel: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.badVoiceChannel"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },

            role_timeout: async () => {
                await this.logAndUpdate(user, msg, i18n.t("badge.roleTimeout"));
                if (!user.stoped) {
                    await user.stop();
                    collector.stop();
                }
            },

            devlopers_message: async (m) => {
                if (!m.message) return;
                await this.logAndUpdate(user, msg, i18n.t("badge.devMessage", { message: m.message }));
            },

            connected_to_channel: async () => this.logAndUpdate(user, msg, i18n.t("badge.connectedToChannel")),

            role_required: async () => {
                await this.logAndlogAndUpdate(user, msg, i18n.t("badge.roleRequired"));

                if (member && questsConfig?.voice.role) {
                    await member.roles.add(questsConfig.voice.role).catch(() => null);
                    user.send({ type: "role_received", target: user.id });

                    setTimeout(() => {
                        member.roles.remove(questsConfig.voice.role).catch(() => null);
                    }, 30000);
                }
            }
        };

        const listener = async (m) => {
            if (m.target && m.target !== user.id) return;

            const handler = handlers[m.type];
            if (handler) {
                try {
                    await handler(m);
                } catch (err) {
                    Logger.error(`Handler error for ${m.type}:`, err);
                }
            }
        };

        const cleanup = () => {
            user.off("message", listener);
            Logger.debug(`Listener removed for user ${user.id}`);
            setTimeout(() => user = null, 5000);
        };

        user.on("message", listener);
        user.once("stopped", cleanup);
    }

    setupCollector(author, user, member, msg, client, i18n, isVip = false) {
        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === author,
            time: client.clientMs("20m")
        });

        collector.on("collect", async (i) => {
            try {

                if (i.isButton()) {

                    if (i.customId === "restart_badge") {
                        return this.execute({ interaction: i, client, i18n });
                    }

                    switch (i.customId) {
                        case "enroll": {
                            const response = await user.selectedQuest.enroll();
                            if (response) return i.update({ ...user.genreate_message() });
                            return i.reply({
                                embeds: [new EmbedBuilder().setDescription(i18n.t("badge.enrollFailed")).setColor("DarkRed")],
                                ephemeral: true,
                            });
                        }

                        case "start": {
                            if (user.started) {
                                return i.reply({
                                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.alreadyStarted")).setColor("DarkRed")],
                                    ephemeral: true,
                                });
                            }

                            const childProcess = ChildManager.getLowestUsageChild();

                            if (childProcess.currentTasks >= questsConfig.questsPerChildProcess && !isVip) {
                                return i.reply({
                                    embeds: [
                                        new EmbedBuilder().setDescription(
                                            i18n.t("badge.maxUsage", {
                                                usage: ChildManager.TotalUsage.toString(),
                                                maxUsage: ChildManager.maxUsage,
                                            })
                                        ).setColor("DarkRed"),
                                    ],
                                    ephemeral: true,
                                });
                            }

                            user.setProcess(childProcess.process);
                            childProcess.currentTasks++;

                            await user.start();
                            this.logAndUpdate(user, msg, i18n.t("badge.started"));
                            this.registerChildHandlers(user, member, msg, i18n, collector);
                            return i.update({ ...user.genreate_message() });
                        }

                        case "refresh": {
                            if (!(await this.tryFetchQuests(user, msg, i18n))) return;
                            return i.update({ ...user.genreate_message() });
                        }

                        case "stop": {
                            if (user.stoped) {
                                return i.reply({
                                    embeds: [new EmbedBuilder().setDescription(i18n.t("badge.alreadyStoped")).setColor("DarkRed")],
                                    ephemeral: true,
                                });
                            }
                            user.stop();
                            collector.stop();
                            return i.update({ ...user.genreate_message() });
                        }
                    }
                }

                if (i.isStringSelectMenu()) {
                    const quest = user.quests.get(i.values[0]);
                    if (quest) user.setQuest(quest);
                    return i.update({ ...user.genreate_message() });
                }

            } catch (err) {
                Logger.error("Collector error:", err);
                await i.reply({
                    embeds: [new EmbedBuilder().setDescription("⚠️ Something went wrong.")],
                    ephemeral: true,
                }).catch(() => null);
            }
        });

        collector.on("end", async () => {
            await delay(1000);

            await msg.edit({
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                label: "sawtr",
                                custom_id: "restart_badge",
                                style: 1
                            }
                        ]
                    }
                ]
            }).catch(() => null);

            if (!user.destroyed) {
                user.destroy();
            }

            user = null;
        });
    }
}

module.exports = BadgeCommand;
