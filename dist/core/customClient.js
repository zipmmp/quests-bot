// src/core/CustomClient.js
const { ActivityType, Client, Collection, parseEmoji, SnowflakeUtil } = require('discord.js');
const { Logger } = require('../core/logger.js');
const config = require('../config/config.js');
const { i18n } = require('../providers/i18n.js');
const { duration, findClosestIndexFolder, findProjectRoot } = require('../utils/tools.js');
const ms = require('ms');
const path = require('path');
const fs = require('fs');
const readProxy = require('../utils/loadProxy.js'); // import default function only
const emojis = require('../config/emojis.js');
const { loadFolder } = require('../handler/folderLoader.js');
const { ChildManager } = require('./ChildManager.js');
const questsConfig = require('../config/questsConfig.js');
const { customCollection } = require('../lib/quest/handler/customCollection.js');
class CustomClient extends Client {
    constructor(options) {
        super(options);
        // properties (no TS types)
        this.cooldowns = new Collection();
        this.messageCommands = new Collection();
        this.slashCommands = new Collection();
        this.buttons = new Collection();
        this.menus = new Collection();
        this.i18n = i18n; // instance from provider
        this.ready = false;
        this.guildSettings = new Collection();
        this.userSettings = new customCollection();
        this.config = config;
        this.proxy = new Collection();
        this.images = new Collection();
        this.questsSupported = [];
        // internal map to dedupe concurrent emoji creations
        this.emojiTasks = new Map();
        // alias to duration util
        this.formatDuration = duration;
        // expose ms utility
        this.clientMs = ms;
        // start loading quests immediately (async)
        this.loadQuests().catch(err => Logger.error("Error loading quests:", err));
        this.once("ready", () => {
            // when ready, load emojis and child processes and proxies
            this.loadEmojis().catch(err => Logger.error("Error in loadEmojis:", err));
            this.loadChildProcess();
            try {
                readProxy(this.proxy);
            }
            catch (err) {
                Logger.error("Error reading proxies:", err);
            }
        });
    }
    async loadQuests() {
        try {
            const rootDir = findClosestIndexFolder();
            if (!rootDir) {
                Logger.warn("Root dir not found for quests");
                return;
            }
            const questsFolder = path.join(rootDir, "quests");
            const quests = await loadFolder(questsFolder, { logger: true, shouldReturn: true, subFolders: true }) || [];
            // expect each quest to have a .name property
            this.questsSupported = quests.map(q => q?.name).filter(Boolean);
            Logger.info(`Quests loaded: ${this.questsSupported.length}`);
            Logger.info(`Quests: ${this.questsSupported.join(", ")}`);
        }
        catch (err) {
            Logger.error("Failed to load quests:", err);
        }
    }
    async loadChildProcess() {
        try {
            ChildManager.loadChildProcess();
        }
        catch (err) {
            Logger.error("Error loading child process:", err);
        }
    }
    updateActivity() {
        try {
            // Note: depending on discord.js version you may need to use client.user.setPresence(...)
            if (this.user && this.user.setActivity) {
                this.user.setActivity(`Managing ${ChildManager.TotalUsage}/${ChildManager.maxUsage} solver(s)`, {
                    type: ActivityType.Competing,
                    url: questsConfig.inviteUrl
                });
            }
        }
        catch (err) {
            Logger.error("Error updating activity:", err);
        }
    }
    // loadEmojis will fetch existing emojis then attempt to create local-file emojis if missing
    async loadEmojis() {
        try {
            if (this.application && this.application.emojis) {
                const e = await this.application.emojis.fetch();
                Logger.info(`Emojis loaded: ${e.size}`);
            }
        }
        catch (error) {
            Logger.error("Error fetching emojis:", error);
        }
        finally {
            try {
                const emojiFolderPath = path.join(findProjectRoot(), "emojis");
                if (fs.existsSync(emojiFolderPath) && fs.statSync(emojiFolderPath).isDirectory()) {
                    const emojiFiles = fs.readdirSync(emojiFolderPath)
                        .filter(file => {
                        const ext = file.split(".").pop().toLowerCase();
                        return ["png", "gif", "jpg", "jpeg"].includes(ext);
                    });
                    for (const file of emojiFiles) {
                        const emojiName = file.split(".")[0];
                        const emojiPath = path.join(emojiFolderPath, file);
                        const existing = this.getEmoji(emojiName, false);
                        if (!existing) {
                            try {
                                const buffer = fs.readFileSync(emojiPath);
                                await this.createEmojiWithBuffer(emojiName, buffer, true);
                            }
                            catch (err) {
                                Logger.error(`Error creating emoji ${emojiName}:`, err);
                                continue;
                            }
                        }
                    }
                }
            }
            catch (err) {
                Logger.error("Error in emoji finalizer:", err);
            }
        }
    }
    // getEmoji: returns string representation, "" if returnBlank true, else null
    getEmoji(emojiName, returnBlank = false) {
        try {
            const cache = this.application?.emojis?.cache;
            if (!cache)
                return returnBlank ? "" : null;
            const emoji = cache.find(e => e.name?.toLowerCase().trim() === (emojiName || "").toLowerCase().trim());
            return emoji ? emoji.toString() : (returnBlank ? "" : null);
        }
        catch (err) {
            Logger.error("getEmoji error:", err);
            return returnBlank ? "" : null;
        }
    }
    get emojisList() {
        try {
            return emojis(this); // assumes emojis is a function that accepts client
        }
        catch (err) {
            return [];
        }
    }
    // createEmoji: dedupes concurrent creations with emojiTasks map
    createEmoji(emojiName, emojiUrlOrBuffer, force = false) {
        // Return cached if exists
        const existing = this.getEmoji(emojiName, false);
        if (existing && !force) {
            return Promise.resolve(existing);
        }
        // If task exists, return it
        if (this.emojiTasks.has(emojiName)) {
            return this.emojiTasks.get(emojiName);
        }
        const task = (async () => {
            try {
                const createdEmoji = await this.application.emojis.create({
                    attachment: emojiUrlOrBuffer,
                    name: emojiName
                });
                Logger.info(`Emoji ${createdEmoji.name} created`);
                return createdEmoji.toString();
            }
            catch (err) {
                Logger.error(`Error creating emoji ${emojiName}:`, err);
                throw err;
            }
            finally {
                // remove task from map
                this.emojiTasks.delete(emojiName);
            }
        })();
        this.emojiTasks.set(emojiName, task);
        return task;
    }
    // delete emoji by name
    async deleteEmoji(emojiName) {
        try {
            const emojiStr = this.getEmoji(emojiName, false);
            const parsed = parseEmoji(emojiStr || "");
            const id = parsed?.id;
            if (emojiStr && id) {
                await this.application.emojis.delete(id);
                Logger.info(`Emoji ${emojiName} deleted`);
                return true;
            }
            return false;
        }
        catch (err) {
            Logger.error("deleteEmoji error:", err);
            return false;
        }
    }
    // create emoji from Buffer
    async createEmojiWithBuffer(emojiName, buffer, force = false) {
        const existing = this.getEmoji(emojiName, false);
        if (existing && !force)
            return existing;
        try {
            const createdEmoji = await this.application.emojis.create({
                attachment: buffer,
                name: emojiName
            });
            Logger.info(`Emoji ${createdEmoji.name} created`);
            return createdEmoji.toString();
        }
        catch (err) {
            Logger.error(`Error creating emoji from buffer ${emojiName}:`, err);
            throw err;
        }
    }
    // Build a command name from an interaction (supports subcommands / groups)
    getCommandName(interaction) {
        try {
            if (!interaction || typeof interaction.isChatInputCommand !== "function" || !interaction.isChatInputCommand())
                return null;
            let commandName = (interaction.commandName || "").toLowerCase();
            const subCommandName = (() => { try {
                return interaction.options.getSubcommand(false);
            }
            catch {
                return null;
            } })();
            const subCommandGroupName = (() => { try {
                return interaction.options.getSubcommandGroup(false);
            }
            catch {
                return null;
            } })();
            if (subCommandGroupName)
                commandName += `-${subCommandGroupName}`;
            if (subCommandName)
                commandName += `-${subCommandName}`;
            return commandName.toLowerCase();
        }
        catch (err) {
            Logger.error("getCommandName error:", err);
            return null;
        }
    }
    isSnowflakeId(id) {
        try {
            if (!id)
                return false;
            const snowflakeRegex = /^\d{17,19}$/;
            const timetest = SnowflakeUtil.timestampFrom(id);
            return snowflakeRegex.test(id) && timetest > 0;
        }
        catch (err) {
            return false;
        }
    }
}
