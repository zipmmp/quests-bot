// file: structures/EmbedBuilder.ts
const { EmbedBuilder as DiscordEmbedBuilder } = require('discord.js');
const config = require('../../config/config.js');
class EmbedBuilder extends DiscordEmbedBuilder {
    constructor(options) {
        super(options);
        this.setColor(`#${config.embedColor.replaceAll("#", "")}`);
    }
}
