const { ChatInputCommandInteraction, SlashCommandStringOption } = require('discord.js');
const { SlashCommand, slashCommandFlags } = require('../../lib/quest/handler/slashCommand.js');
const { CustomClient } = require('../../core/customClient.js');
const { I18nInstance } = require('../../core/i18n.js');
const { EmbedBuilder } = require('../../lib/quest/handler/embedBuilder.js');
const { usersCache } = require('../../core/cache.js');

module.exports = class setLang extends SlashCommand {
    constructor() {
        super();
        this.name = "send_message";
        this.description = "Send a message to all quest solver users";
        this.options = [
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("message")
                .setDescription("message")
                .setMinLength(3)
        ];
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
        const message = interaction.options.getString("message", true);

        const solvers = usersCache.filter(e => e.started && e.process);
        if (solvers.size === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`${i18n.t("sendMessage.noUsers")}`)
                        .setColor("DarkRed")
                ]
            });
        }

        solvers.forEach(user => {
            user.emit("message", { message, type: "devlopers_message" });
        });

        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`${i18n.t("sendMessage.messageSent", { users: solvers.size.toString() })}`)
                    .setColor("Green")
            ]
        });
    }
}
