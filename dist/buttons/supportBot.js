const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { buttonCommand } = require('../lib/quest/handler/buttons.js');
const questsConfig = require('../config/questsConfig.js');
module.exports = class supportButton extends buttonCommand {
    constructor() {
        super(...arguments);
        this.name = "supportbot";
        this.description = "";
        this.options = [];
        this.cooldown = "5s";
        this.allowedServers = [];
        this.allowedUsers = [];
        this.allowedChannels = [];
        // public permissions: permissionList[] = ["Administrator"];
        this.bot_permissions = [];
        this.flags = ["noReply"];
    }
    embed(des) {
        return new EmbedBuilder().setDescription(des);
    }
    async execute({ interaction, client, i18n, lang }) {
        const buttons = questsConfig.buttons;
        const comp = [];
        const buttonsRow = new ActionRowBuilder();
        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index];
            let emoji = button?.emoji;
            if (emoji && typeof (emoji) == "function") {
                // @ts-ignore
                emoji = emoji(client);
            }
            const buttonBuilder = new ButtonBuilder()
                .setStyle(ButtonStyle.Link);
            if (button.text)
                buttonBuilder.setLabel(button.text);
            if (button.url)
                buttonBuilder.setURL(button.url);
            if (emoji)
                buttonBuilder.setEmoji(`${emoji}`);
            buttonsRow.addComponents(buttonBuilder);
        }
        if (buttons.length > 0)
            comp.push(buttonsRow);
        interaction.reply({
            ephemeral: true,
            embeds: [new EmbedBuilder().setDescription(i18n.t("badge.supportedQuest")).setColor("DarkRed")],
            components: comp
        });
    }
}
