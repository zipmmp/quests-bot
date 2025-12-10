const axios = require('axios');

class QuestManager {
    constructor(config) {
        this.config = config;
        this.serverId = config?.serverId || "1399471603003428966";
        
        // تخزين المهام والحسابات
        this.availableQuests = new Map();
        this.userAccounts = new Map();
        this.scanHistory = [];
        
        // المديرين
        this.proxyManager = null;
        this.userAgentManager = null;
        
        // إحصائيات
        this.stats = {
            totalScans: 0,
            totalQuestsDiscovered: 0,
            successfulScans: 0,
            failedScans: 0,
            lastScanTime: null,
            regionsUsed: []
        };
    }
    
    /**
     * تعيين مدير Proxy
     */
    setProxyManager(proxyManager) {
        this.proxyManager = proxyManager;
    }
    
    /**
     * تعيين مدير User-Agent
     */
    setUserAgentManager(userAgentManager) {
        this.userAgentManager = userAgentManager;
    }
    
    /**
     * إضافة حساب مستخدم مع المنطقة
     */
    addUserAccount(accountId, token, username = 'Unknown', region = 'eu') {
        this.userAccounts.set(accountId, {
            id: accountId,
            token: token,
            username: username,
            region: region,
            isActive: true,
            lastScan: null,
            scanCount: 0,
            discoveredQuests: 0,
            proxyUsed: null,
            userAgent: null
        });
        
        console.log(`👤 تمت إضافة حساب: ${username} (${region})`);
        return accountId;
    }
    
    /**
     * المسح باستخدام جميع الحسابات
     */
    async scanWithAllAccounts() {
        const startTime = Date.now();
        const results = {
            newQuests: [],
            totalDiscovered: 0,
            accountsUsed: 0,
            accountStats: [],
            regionsUsed: new Set(),
            scanDuration: 0
        };
        
        console.log(`🔍 بدء المسح باستخدام ${this.userAccounts.size} حساب...`);
        
        const activeAccounts = Array.from(this.userAccounts.values())
            .filter(acc => acc.isActive);
        
        if (activeAccounts.length === 0) {
            console.log('⚠️  لا توجد حسابات نشطة للمسح');
            return results;
        }
        
        // مسح متزامن محدود
        const concurrentLimit = 2; // 2 حساب في نفس الوقت لتجنب الحظر
        const accountChunks = this.chunkArray(activeAccounts, concurrentLimit);
        
        for (const chunk of accountChunks) {
            // مسح مجموعة من الحسابات بالتوازي
            const chunkPromises = chunk.map(account => 
                this.scanSingleAccount(account)
            );
            
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            // معالجة النتائج
            chunkResults.forEach((result, index) => {
                const account = chunk[index];
                
                if (result.status === 'fulfilled' && result.value) {
                    const quests = result.value.quests;
                    const proxyInfo = result.value.proxyInfo;
                    const userAgent = result.value.userAgent;
                    
                    if (quests.length > 0) {
                        results.newQuests.push(...quests);
                        results.totalDiscovered += quests.length;
                        
                        // تحديث إحصائيات الحساب
                        account.discoveredQuests += quests.length;
                        account.scanCount++;
                        account.lastScan = new Date();
                        account.proxyUsed = proxyInfo;
                        account.userAgent = userAgent;
                    }
                    
                    // إضافة المنطقة المستخدمة
                    if (proxyInfo && proxyInfo.region) {
                        results.regionsUsed.add(proxyInfo.region);
                    }
                    
                    results.accountStats.push({
                        accountId: account.id,
                        username: account.username,
                        region: account.region,
                        discoveredQuests: quests.length,
                        scanSuccess: true,
                        proxyRegion: proxyInfo?.region
                    });
                    
                } else {
                    // فشل المسح
                    results.accountStats.push({
                        accountId: account.id,
                        username: account.username,
                        region: account.region,
                        discoveredQuests: 0,
                        scanSuccess: false,
                        error: result.reason?.message
                    });
                    
                    // تعطيل الحساب إذا فشل عدة مرات
                    const failCount = account.scanCount - account.discoveredQuests;
                    if (failCount > 3) {
                        account.isActive = false;
                        console.log(`⛔ تم تعطيل الحساب ${account.username} بعد 3 فشلات`);
                    }
                }
                
                results.accountsUsed++;
            });
            
            // تأخير بين المجموعات
            if (accountChunks.indexOf(chunk) < accountChunks.length - 1) {
                await this.delay(3000);
            }
        }
        
        // إزالة التكرارات
        results.newQuests = [...new Set(results.newQuests)];
        results.scanDuration = Date.now() - startTime;
        results.regionsUsed = Array.from(results.regionsUsed);
        
        // تحديث الإحصائيات
        this.stats.totalScans++;
        this.stats.totalQuestsDiscovered += results.newQuests.length;
        this.stats.lastScanTime = new Date();
        this.stats.regionsUsed = results.regionsUsed;
        
        // حفظ في السجل
        this.scanHistory.push({
            timestamp: new Date(),
            accountsUsed: results.accountsUsed,
            newQuests: results.newQuests,
            regions: results.regionsUsed,
            duration: results.scanDuration
        });
        
        if (this.scanHistory.length > 50) {
            this.scanHistory.shift();
        }
        
        console.log(`✅ انتهى المسح: ${results.newQuests.length} مهمة جديدة خلال ${results.scanDuration}ms`);
        console.log(`📍 المناطق المستخدمة: ${results.regionsUsed.join(', ')}`);
        
        return results;
    }
    
    /**
     * مسح حساب واحد
     */
    async scanSingleAccount(account) {
        const maxRetries = 3;
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.fetchQuestsForAccount(account, attempt);
                
                if (attempt > 1) {
                    console.log(`   🔄 محاولة ${attempt} ناجحة للحساب ${account.username}`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                console.warn(`   ⚠️  محاولة ${attempt} فشلت للحساب ${account.username}: ${error.message}`);
                
                if (attempt < maxRetries) {
                    await this.delay(2000 * attempt); // تأخير متزايد
                }
            }
        }
        
        throw lastError || new Error('فشل جميع محاولات المسح');
    }
    
    /**
     * جلب المهام لحساب معين
     */
    async fetchQuestsForAccount(account, attempt = 1) {
        // الحصول على User-Agent للمنطقة
        let userAgent;
        if (this.userAgentManager) {
            userAgent = this.userAgentManager.getRegionalUserAgent(account.region);
        } else {
            userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        }
        
        // الحصول على بروكسي للمنطقة
        let proxyInfo = null;
        let axiosConfig = {};
        
        if (this.proxyManager) {
            proxyInfo = this.proxyManager.getProxyForRegion(account.region);
            if (proxyInfo) {
                axiosConfig = this.proxyManager.getAxiosConfig(proxyInfo);
                console.log(`   🌐 ${account.username}: ${proxyInfo.region} (${proxyInfo.url})`);
            }
        }
        
        // إنشاء headers متقدمة
        const headers = {
            'Authorization': account.token,
            'User-Agent': userAgent,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': this.getAcceptLanguage(account.region),
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            'Origin': 'https://discord.com',
            'Referer': `https://discord.com/channels/${this.serverId}`,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        };
        
        // إضافة Super Properties إذا كان UserAgentManager موجوداً
        if (this.userAgentManager) {
            const superProps = this.userAgentManager.generateSuperProperties(userAgent, account.region);
            headers['X-Super-Properties'] = superProps;
            headers['X-Discord-Locale'] = this.userAgentManager.getLocaleForRegion(account.region);
            headers['X-Discord-Timezone'] = this.getTimezoneForRegion(account.region);
        }
        
        const startTime = Date.now();
        
        try {
            const response = await axios({
                method: 'GET',
                url: `https://discord.com/api/v9/guilds/${this.serverId}/quests`,
                headers: headers,
                timeout: 15000,
                validateStatus: () => true,
                ...axiosConfig
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data && Array.isArray(response.data)) {
                const quests = response.data
                    .map(item => item.type)
                    .filter(type => type && typeof type === 'string');
                
                // تحديث المهام المتاحة
                quests.forEach(quest => {
                    if (!this.availableQuests.has(quest)) {
                        this.availableQuests.set(quest, {
                            firstDiscovered: new Date(),
                            discoveredBy: account.username,
                            discoveryCount: 1,
                            lastSeen: new Date(),
                            region: account.region,
                            proxyUsed: proxyInfo?.region
                        });
                    } else {
                        const questInfo = this.availableQuests.get(quest);
                        questInfo.discoveryCount++;
                        questInfo.lastSeen = new Date();
                    }
                });
                
                // تحديث إحصائيات البروكسي إذا نجح
                if (proxyInfo && this.proxyManager) {
                    this.proxyManager.updateProxyStatus(proxyInfo.id, true, responseTime);
                }
                
                console.log(`   ✅ ${account.username}: ${quests.length} مهمة (${responseTime}ms)`);
                
                return {
                    quests: quests,
                    proxyInfo: proxyInfo,
                    userAgent: userAgent,
                    responseTime: responseTime
                };
                
            } else if (response.status === 401 || response.status === 403) {
                // التوكن غير صالح
                account.isActive = false;
                
                if (proxyInfo && this.proxyManager) {
                    this.proxyManager.updateProxyStatus(proxyInfo.id, false);
                }
                
                throw new Error(`الحساب محظور (${response.status})`);
            } else {
                if (proxyInfo && this.proxyManager) {
                    this.proxyManager.updateProxyStatus(proxyInfo.id, false);
                }
                
                throw new Error(`استجابة غير متوقعة: ${response.status}`);
            }
            
        } catch (error) {
            // تحديث إحصائيات البروكسي إذا فشل
            if (proxyInfo && this.proxyManager) {
                this.proxyManager.updateProxyStatus(proxyInfo.id, false);
            }
            
            if (error.code === 'ECONNABORTED') {
                throw new Error(`انتهت مهلة الاتصال (${account.region})`);
            } else if (error.code === 'ECONNREFUSED') {
                throw new Error(`رفض الاتصال بالبروكسي (${account.region})`);
            }
            
            throw error;
        }
    }
    
    /**
     * الحصول على Accept-Language للمنطقة
     */
    getAcceptLanguage(region) {
        const languages = {
            'eu': 'en-US,en;q=0.9,de;q=0.8,fr;q=0.7',
            'us': 'en-US,en;q=0.9',
            'ar': 'ar-SA,ar;q=0.9,en;q=0.8',
            'ae': 'ar-AE,ar;q=0.9,en;q=0.8',
            'sa': 'ar-SA,ar;q=0.9,en;q=0.8',
            'de': 'de-DE,de;q=0.9,en;q=0.8',
            'fr': 'fr-FR,fr;q=0.9,en;q=0.8',
            'es': 'es-ES,es;q=0.9,en;q=0.8',
            'it': 'it-IT,it;q=0.9,en;q=0.8'
        };
        
        return languages[region] || 'en-US,en;q=0.9';
    }
    
    /**
     * الحصول على Timezone للمنطقة
     */
    getTimezoneForRegion(region) {
        const timezones = {
            'eu': 'Europe/London',
            'us': 'America/New_York',
            'ar': 'Asia/Riyadh',
            'ae': 'Asia/Dubai',
            'sa': 'Asia/Riyadh',
            'de': 'Europe/Berlin',
            'fr': 'Europe/Paris',
            'es': 'Europe/Madrid',
            'it': 'Europe/Rome'
        };
        
        return timezones[region] || 'Europe/London';
    }
    
    /**
     * تجزئة المصفوفة
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * الحصول على جميع المهام
     */
    getAllQuests() {
        return Array.from(this.availableQuests.keys());
    }
    
    /**
     * الحصول على إجمالي المهام المكتشفة
     */
    getTotalDiscoveredQuests() {
        return this.stats.totalQuestsDiscovered;
    }
    
    /**
     * الحصول على عدد الحسابات النشطة
     */
    getActiveAccountsCount() {
        return Array.from(this.userAccounts.values())
            .filter(acc => acc.isActive).length;
    }
    
    /**
     * الحصول على إحصائيات
     */
    getStats() {
        return {
            totalScans: this.stats.totalScans,
            totalQuestsDiscovered: this.stats.totalQuestsDiscovered,
            currentQuests: this.availableQuests.size,
            lastScan: this.stats.lastScanTime,
            regionsUsed: this.stats.regionsUsed,
            successfulScans: this.stats.successfulScans,
            failedScans: this.stats.failedScans
        };
    }
    
    /**
     * تأخير تنفيذ
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = QuestManager;
