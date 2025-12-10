const { AttachmentBuilder } = require("discord.js");
const questsConfig = require("../../config/questsConfig.js");
const { client } = require("../../index.js");
const { decodeTimestampFromUrl } = require("./tokenUtils.js");
const { imageRepo } = require("../../core/cache.js");
const axios = require("axios");
const { extractFirstFrame } = require("../loadEmoji.js");
const { Logger } = require("../../core/logger.js");

const uploadCache = new Map();

async function fetchChannel(guildId, channelId) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;
    return (
        guild.channels.cache.get(channelId) ||
        await guild.channels.fetch(channelId).catch(() => null)
    );
}

async function refreshExpiredImage(questImage) {
    const guild = client.guilds.cache.get(questImage.guildId);
    if (!guild) return null;

    const channel = await fetchChannel(questImage.guildId, questsConfig.image.channelId);
    if (!channel) return null;

    const message = await channel.messages.fetch(questImage.messageId).catch(() => null);
    if (!message) return null;

    const newImage = message.attachments.find(e => e.url);
    if (!newImage) return null;

    questImage.url = newImage.url;
    await imageRepo.save(questImage);

    return newImage.url;
}

async function _uploadNewImage(key, url, round) {
    let response = await axios.get(url, { responseType: "arraybuffer" }).catch(() => null);
    if (!response || !response.data) {
        Logger.error("Failed to fetch image from URL");
        return null;
    }

    const guild = client.guilds.cache.get(questsConfig.image.guildId);
    const channel = guild ? await fetchChannel(guild.id, questsConfig.image.channelId) : null;
    if (!channel) {
        Logger.error("Channel not found for uploading quest images");
        return null;
    }

    const imageName = `${url.split("/").pop().split(".")[0]}`;
    Logger.info(`Uploading new image: ${imageName}`);

    let buffer = await extractFirstFrame(response.data, 512, imageName, round).catch(() => null);
    response = null;
    if (!buffer) {
        Logger.error("Failed to process image buffer");
        return null;
    }

    let attachment = new AttachmentBuilder(buffer).setName(imageName + ".png");
    const newMessage = await channel.send({ files: [attachment] });
    buffer = null;
    attachment = null;

    const uploadedImage = newMessage.attachments.find(e => e.url);
    if (!uploadedImage) {
        Logger.error("Failed to upload image to Discord channel");
        return null;
    }

    const newImageData = imageRepo.create({
        key,
        url: uploadedImage.url,
        name: uploadedImage.name,
        expireTimestamp: decodeTimestampFromUrl(uploadedImage.url),
        messageId: newMessage.id,
        channelId: newMessage.channelId,
        guildId: newMessage.guildId,
    });

    await imageRepo.save(newImageData);
    client.images.set(key, newImageData);

    return uploadedImage.url;
}

async function uploadNewImage(key, url, round) {
    if (uploadCache.has(key)) {
        return uploadCache.get(key);
    }
    const uploadPromise = _uploadNewImage(key, url, round);
    uploadCache.set(key, uploadPromise);
    const result = await uploadPromise;
    uploadCache.delete(key);
    return result;
}

async function getUrlFromDatabase(key, url, round) {
    const questImage = client.images.get(key);
    const isExpired = questImage && decodeTimestampFromUrl(questImage.url) < Date.now();

    if (questImage && !isExpired) {
        return questImage.url;
    }

    if (isExpired && questImage) {
        const refreshedUrl = await refreshExpiredImage(questImage);
        if (refreshedUrl) return refreshedUrl;
    }

    return await uploadNewImage(key, url, round);
}

module.exports = {
    fetchChannel,
    refreshExpiredImage,
    uploadNewImage,
    getUrlFromDatabase
};
