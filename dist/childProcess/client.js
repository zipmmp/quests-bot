const { Client, Options } = require('discord.js-selfbot-v13');
const { proxyToUrl } = require('./tools.js');
const { ProxyAgent } = require('proxy-agent');
class customSelfClient extends Client {
    constructor(proxy, options = {}) {
        if (proxy?.authentication && proxy?.ip) {
            const proxyUrl = proxyToUrl(proxy);
            options.ws = {
                agent: new ProxyAgent({
                    getProxyForUrl: () => proxyUrl
                }),
            };
        }
        options.sweepers = {
            messages: {
                interval: 3_600,
                lifetime: 1_800,
            },
        };
        options.makeCache = Options.cacheWithLimits({
            ApplicationCommandManager: 0,
            BaseGuildEmojiManager: 0,
            AutoModerationRuleManager: 0,
            GuildBanManager: 0,
            GuildEmojiManager: 0,
            GuildStickerManager: 0,
            GuildMemberManager: 0,
            GuildScheduledEventManager: 0,
            GuildInviteManager: 0,
            MessageManager: 0,
            PresenceManager: 0,
            ReactionManager: 0,
            ReactionUserManager: 0,
            StageInstanceManager: 0,
            ThreadManager: 0,
            ThreadMemberManager: 0,
            UserManager: 0,
            VoiceStateManager: 10,
        }),
            super(options);
    }
}
