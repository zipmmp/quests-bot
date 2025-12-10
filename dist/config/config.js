const QuestManager = require('./questManager');

class ConfigManager {
    constructor() {
        this.questManager = new QuestManager({
            serverId: "1399471603003428966"
        });
        
        // التوكنات المباشرة
        this.tokens = {
            // أضف توكنات المستخدم هنا مباشرة
            userTokens: [
                "NzkyNDE2MjUzMDExNjkxMjU2.G1Dc9B.9f8Jw7i6K5l4M3n2B1v8C9x0Z", // مثال
                "NzkyNDE2MjUzMDExNjkxMjU3.G2Ec8A.8e7Iv6j5K4l3M2n1B0u9D8y7Z"  // مثال
            ],
            
            // توكن البوت للإرسال (اختياري)
            botToken: "MTE5Mjg0NDU0NDY3NDgxNjA1OA.G1Dc9B.9f8Jw7i6K5l4M3n2B1v8C9x0Z"
        };
        
        this.configuration = {
            // إعدادات الاكتشاف
            detection: {
                enabled: true,
                scanInterval: 300000, // 5 دقائق
                immediateNotification: true,
                retryAttempts: 3,
                maxConcurrentScans: 2
            },
            
            // إعدادات الإشعارات Discord
            discordNotifications: {
                enabled: true,
                channelId: "1414963290391707779",
                roleId: "1405572212403994684",
                webhookUrl: "" // Webhook بديل
            },
            
            // إعدادات VPN/Proxy
            proxySettings: {
                enabled: true,
                rotateProxies: true,
                proxyType: "http", // أو socks5
                proxyTimeout: 10000,
                regionRotation: true,
                preferredRegions: ["EU", "US", "AE", "SA"] // أوروبا، أمريكا، الإمارات، السعودية
            },
            
            // إعدادات User-Agent
            userAgentSettings: {
                rotateAgents: true,
                mobileAgents: true,
                desktopAgents: true,
                regionBasedAgents: true
            },
            
            // المهام
            quests: {
                durationQuests: [],
                excludedQuests: ["COMPLETE_QUEST"]
            },
            
            // السجلات
            logging: {
                enabled: true,
                consoleLevel: "detailed",
                saveToFile: false
            }
        };
        
        this.notificationHistory = [];
        this.questHistory = [];
        this.proxyManager = null;
        this.userAgentManager = null;
    }
    
    /**
     * تهيئة النظام
     */
    async initialize() {
        console.log('🚀 تهيئة نظام استخراج المهام...');
        
        try {
            // 1. تحميل مديري VPN/Proxy و User-Agent
            await this.loadManagers();
            
            // 2. إضافة التوكنات لمدير المهام
            this.tokens.userTokens.forEach((token, index) => {
                const accountId = `user_${index + 1}`;
                
                // تحديد المنطقة لهذا الحساب
                const region = this.configuration.proxySettings.preferredRegions[
                    index % this.configuration.proxySettings.preferredRegions.length
                ];
                
                this.questManager.addUserAccount(
                    accountId, 
                    token, 
                    `User_${index + 1}`,
                    region
                );
            });
            
            console.log(`✅ تم تحميل ${this.tokens.userTokens.length} توكن مباشر`);
            
            // 3. المسح الأولي
            console.log('🔍 المسح الأولي للمهام...');
            const results = await this.questManager.scanWithAllAccounts();
            
            if (results.newQuests.length > 0) {
                console.log(`🎯 اكتشاف ${results.newQuests.length} مهمة في المسح الأولي`);
                
                // إرسال إشعار فوري
                await this.sendDiscordNotification('initial_scan', {
                    newQuests: results.newQuests,
                    accountsUsed: results.accountsUsed,
                    timestamp: new Date()
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ فشل التهيئة:', error);
            return false;
        }
    }
    
    /**
     * تحميل المديرين
     */
    async loadManagers() {
        const { ProxyManager } = require('./vpnproxy');
        const { UserAgentManager } = require('./userAgent');
        
        this.proxyManager = new ProxyManager(this.configuration.proxySettings);
        this.userAgentManager = new UserAgentManager(this.configuration.userAgentSettings);
        
        // تمرير المديرين لـ QuestManager
        this.questManager.setProxyManager(this.proxyManager);
        this.questManager.setUserAgentManager(this.userAgentManager);
        
        console.log('✅ تم تحميل مديري VPN/Proxy و User-Agent');
    }
    
    /**
     * إرسال إشعار Discord
     */
    async sendDiscordNotification(type, data) {
        if (!this.configuration.discordNotifications.enabled) return;
        
        try {
            const axios = require('axios');
            
            let embed;
            let content = '';
            
            switch(type) {
                case 'new_quest':
                    embed = {
                        title: "🎯 مهمة جديدة متاحة!",
                        description: `تم اكتشاف **${data.newQuests.length}** مهمة جديدة`,
                        color: 0x00ff00,
                        fields: data.newQuests.slice(0, 10).map((quest, i) => ({
                            name: `المهمة ${i + 1}`,
                            value: `\`${quest}\``,
                            inline: true
                        })),
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `تم الاكتشاف بواسطة ${data.accountsUsed || 1} حساب`
                        }
                    };
                    
                    if (data.newQuests.length > 10) {
                        embed.fields.push({
                            name: "والمزيد...",
                            value: `+${data.newQuests.length - 10} مهمة أخرى`,
                            inline: false
                        });
                    }
                    
                    if (this.configuration.discordNotifications.roleId) {
                        content = `<@&${this.configuration.discordNotifications.roleId}>`;
                    }
                    break;
                    
                case 'initial_scan':
                    embed = {
                        title: "🚀 بدء نظام المهام",
                        description: "تم تهيئة النظام وبدء المراقبة تلقائياً",
                        color: 0x3498db,
                        fields: [
                            {
                                name: "الحسابات",
                                value: `${data.accountsUsed || 0} حساب`,
                                inline: true
                            },
                            {
                                name: "المهام المكتشفة",
                                value: `${data.newQuests?.length || 0} مهمة`,
                                inline: true
                            },
                            {
                                name: "المناطق",
                                value: `${this.configuration.proxySettings.preferredRegions.join(', ')}`,
                                inline: true
                            }
                        ],
                        timestamp: new Date().toISOString()
                    };
                    break;
                    
                case 'error':
                    embed = {
                        title: "❌ خطأ في النظام",
                        description: data.error || 'حدث خطأ غير معروف',
                        color: 0xff0000,
                        fields: [
                            {
                                name: "النوع",
                                value: data.errorType || 'عام',
                                inline: true
                            },
                            {
                                name: "المنطقة",
                                value: data.region || 'غير معروف',
                                inline: true
                            }
                        ],
                        timestamp: new Date().toISOString()
                    };
                    break;
                    
                default:
                    embed = {
                        title: "🔔 إشعار جديد",
                        description: JSON.stringify(data, null, 2),
                        color: 0x3498db,
                        timestamp: new Date().toISOString()
                    };
            }
            
            // استخدام Webhook إذا متوفر
            if (this.configuration.discordNotifications.webhookUrl) {
                await axios.post(this.configuration.discordNotifications.webhookUrl, {
                    content: content,
                    embeds: [embed],
                    username: "Quest Extractor",
                    avatar_url: "https://cdn.discordapp.com/emojis/1107540807106203718.webp"
                });
            }
            // أو استخدام توكن البوت
            else if (this.tokens.botToken) {
                await this.sendViaBotToken(content, embed);
            }
            
            console.log(`📢 تم إرسال إشعار ${type} إلى Discord`);
            
            // حفظ في السجل
            this.notificationHistory.push({
                type: type,
                data: data,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ خطأ في إرسال إشعار Discord:', error.message);
        }
    }
    
    /**
     * إرسال عبر توكن البوت
     */
    async sendViaBotToken(content, embed) {
        const axios = require('axios');
        
        try {
            await axios.post(`https://discord.com/api/v10/channels/${this.configuration.discordNotifications.channelId}/messages`, {
                content: content,
                embeds: [embed]
            }, {
                headers: {
                    'Authorization': `Bot ${this.tokens.botToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('❌ خطأ في إرسال عبر البوت:', error.message);
        }
    }
    
    /**
     * بدء المراقبة التلقائية
     */
    startAutoMonitoring() {
        if (!this.configuration.detection.enabled) return;
        
        const interval = this.configuration.detection.scanInterval;
        console.log(`👁️  بدء المراقبة التلقائية (كل ${interval / 60000} دقيقة)`);
        
        setInterval(async () => {
            await this.autoScanAndNotify();
        }, interval);
        
        // الفحص الفوري الأول
        setTimeout(() => this.autoScanAndNotify(), 10000);
    }
    
    /**
     * مسح وإشعار تلقائي
     */
    async autoScanAndNotify() {
        console.log('🔍 فحص تلقائي للمهام الجديدة...');
        
        try {
            const results = await this.questManager.scanWithAllAccounts();
            
            if (results.newQuests.length > 0) {
                console.log(`🎯 اكتشاف ${results.newQuests.length} مهمة جديدة!`);
                
                // إرسال إشعار Discord
                await this.sendDiscordNotification('new_quest', {
                    newQuests: results.newQuests,
                    totalDiscovered: results.totalDiscovered,
                    accountsUsed: results.accountsUsed,
                    scanDuration: results.scanDuration,
                    regionsUsed: results.regionsUsed || [],
                    timestamp: new Date()
                });
                
                // حفظ في تاريخ المهام
                this.questHistory.push({
                    timestamp: new Date(),
                    newQuests: results.newQuests,
                    source: 'auto_scan',
                    regions: results.regionsUsed || []
                });
            } else {
                console.log('ℹ️  لم يتم اكتشاف مهام جديدة هذه الدورة');
            }
            
        } catch (error) {
            console.error('❌ خطأ في الفحص التلقائي:', error);
            
            await this.sendDiscordNotification('error', {
                error: error.message,
                errorType: 'auto_scan_failed',
                region: error.region || 'غير معروف',
                timestamp: new Date()
            });
        }
    }
    
    /**
     * إحصائيات النظام
     */
    getStats() {
        const questStats = this.questManager.getStats();
        
        return {
            totalAccounts: this.tokens.userTokens.length,
            activeAccounts: this.questManager.getActiveAccountsCount(),
            totalDiscoveredQuests: questStats.totalQuestsDiscovered,
            recentNotifications: this.notificationHistory.length,
            recentQuests: this.questHistory.length,
            regions: this.configuration.proxySettings.preferredRegions
        };
    }
}

module.exports = ConfigManager;
