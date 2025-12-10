const ConfigManager = require('./config');

class QuestBot {
    constructor() {
        this.configManager = new ConfigManager();
        this.isRunning = false;
        this.statsInterval = null;
    }
    
    async start() {
        console.log(`
╔══════════════════════════════════════════╗
║   Discord Quest Extractor - VPN/Proxy    ║
║      استخراج المهام بمناطق مختلفة       ║
╚══════════════════════════════════════════╝
        `);
        
        this.isRunning = true;
        
        try {
            // 1. عرض معلومات النظام
            this.displaySystemInfo();
            
            // 2. اختبار البروكسيات أولاً
            await this.testProxies();
            
            // 3. تهيئة النظام
            console.log('\n🚀 بدء تهيئة النظام...');
            const initialized = await this.configManager.initialize();
            
            if (!initialized) {
                console.log('❌ فشل تهيئة النظام');
                return;
            }
            
            // 4. بدء المراقبة التلقائية
            this.configManager.startAutoMonitoring();
            
            // 5. إرسال إشعار بدء التشغيل
            await this.configManager.sendDiscordNotification('system_start', {
                message: 'تم بدء نظام استخراج المهام بنجاح',
                timestamp: new Date(),
                accounts: this.configManager.tokens.userTokens.length,
                regions: this.configManager.configuration.proxySettings.preferredRegions
            });
            
            console.log('\n✅ النظام يعمل الآن!');
            console.log('📢 المميزات النشطة:');
            console.log(`   • ${this.configManager.tokens.userTokens.length} توكن مباشر`);
            console.log(`   • VPN/Proxy: ${this.configManager.configuration.proxySettings.enabled ? 'مفعل' : 'معطل'}`);
            console.log(`   • المناطق: ${this.configManager.configuration.proxySettings.preferredRegions.join(', ')}`);
            console.log(`   • المسح: كل ${this.configManager.configuration.detection.scanInterval / 60000} دقيقة`);
            console.log('\n📞 استخدم CTRL+C لإيقاف النظام\n');
            
            // 6. عرض الإحصائيات أولية
            this.displayStats();
            
            // 7. تحديث الإحصائيات كل دقيقة
            this.statsInterval = setInterval(() => this.displayStats(), 60000);
            
        } catch (error) {
            console.error('❌ خطأ في بدء النظام:', error);
        }
    }
    
    /**
     * عرض معلومات النظام
     */
    displaySystemInfo() {
        console.log('\n📋 معلومات النظام:');
        console.log('--------------------------------------');
        console.log('✅ VPN/Proxy Manager: جاهز');
        console.log('✅ User-Agent Manager: جاهز');
        console.log('✅ Discord Notifications: جاهز');
        console.log('✅ Regional Rotation: مفعل');
        console.log('--------------------------------------');
    }
    
    /**
     * اختبار البروكسيات
     */
    async testProxies() {
        console.log('\n🧪 اختبار البروكسيات...');
        
        if (!this.configManager.proxyManager) {
            console.log('⚠️  مدير البروكسي غير متوفر');
            return;
        }
        
        try {
            const results = await this.configManager.proxyManager.testAllProxies();
            
            console.log(`\n📊 نتائج اختبار البروكسيات:`);
            console.log(`   • الإجمالي: ${results.total}`);
            console.log(`   • النشطة: ${results.active}`);
            
            if (results.active === 0) {
                console.log('⚠️  تحذير: لا توجد بروكسيات نشطة!');
                console.log('   سيعمل النظام بدون بروكسي');
            }
            
        } catch (error) {
            console.error('❌ خطأ في اختبار البروكسيات:', error.message);
        }
    }
    
    /**
     * عرض الإحصائيات
     */
    displayStats() {
        const stats = this.configManager.getStats();
        const questStats = this.configManager.questManager.getStats();
        
        // إحصائيات البروكسي
        let proxyStats = { active: 0, total: 0 };
        if (this.configManager.proxyManager) {
            proxyStats = this.configManager.proxyManager.getProxyStats();
        }
        
        console.log(`
╔══════════════════════════════════════════╗
║              📊 إحصائيات النظام          ║
╠══════════════════════════════════════════╣
║ الحسابات: ${stats.activeAccounts}/${stats.totalAccounts} نشط
║ المهام المكتشفة: ${questStats.totalQuestsDiscovered}
║ البروكسيات: ${proxyStats.active}/${proxyStats.total} نشط
║ المناطق: ${stats.regions.join(', ')}
║ آخر مسح: ${questStats.lastScan ? questStats.lastScan.toLocaleTimeString('ar-SA') : 'لا يوجد'}
║ الإشعارات: ${stats.recentNotifications} مرسلة
╚══════════════════════════════════════════╝
        `);
        
        // عرض إحصائيات البروكسي حسب المنطقة
        if (proxyStats.byRegion && Object.keys(proxyStats.byRegion).length > 0) {
            console.log('📍 إحصائيات البروكسي حسب المنطقة:');
            Object.entries(proxyStats.byRegion).forEach(([region, data]) => {
                console.log(`   ${region}: ${data.active}/${data.total} نشط`);
            });
        }
    }
    
    /**
     * إيقاف النظام
     */
    async stop() {
        console.log('\n🛑 إيقاف النظام...');
        
        this.isRunning = false;
        
        // إيقاف interval الإحصائيات
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
        
        // إرسال إشعار إيقاف
        await this.configManager.sendDiscordNotification('system_stop', {
            message: 'تم إيقاف نظام استخراج المهام',
            timestamp: new Date()
        });
        
        console.log('👋 تم إيقاف النظام');
        process.exit(0);
    }
}

// تشغيل النظام
const bot = new QuestBot();

// معالجة إيقاف التشغيل
process.on('SIGINT', () => bot.stop());
process.on('SIGTERM', () => bot.stop());

// بدء النظام
if (require.main === module) {
    bot.start().catch(console.error);
}

module.exports = QuestBot;
