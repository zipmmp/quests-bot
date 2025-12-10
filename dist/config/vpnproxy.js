const axios = require('axios');

class ProxyManager {
    constructor(config) {
        this.config = config;
        this.proxies = new Map();
        this.currentProxyIndex = 0;
        this.regions = new Map();
        this.proxyStats = new Map();
        
        // قوائم بروكسي مجانية من مصادر مختلفة
        this.proxySources = {
            free: [
                // Proxies مجانية عامة (يجب تحديثها دورياً)
                "http://51.15.242.202:8888", // فرنسا
                "http://138.68.60.8:8080",   // ألمانيا
                "http://161.97.92.88:8800",  // هولندا
                "http://94.23.220.136:3128", // فرنسا
                "http://88.198.50.103:8080", // ألمانيا
                "http://45.77.56.114:3128",  // سنغافورة
                "http://167.172.238.15:10000", // أمريكا
                "http://161.35.70.249:8080",  // أمريكا
                "http://195.154.67.94:3128",  // فرنسا
                "http://45.77.165.214:3128",  // سنغافورة
                "http://45.77.63.193:3128",   // سنغافورة
                "http://188.166.83.17:3128",  // هولندا
                "http://167.99.222.214:3128", // أمريكا
                "http://167.172.180.40:10000", // أمريكا
                "http://178.128.113.118:23128", // اليونان
                "http://194.87.188.114:8000",  // روسيا
                "http://103.216.51.210:8191",  // الهند
                "http://200.105.215.22:33630", // الأرجنتين
                "http://103.137.84.17:8265",   // بنغلاديش
                "http://45.119.85.70:8080"    // تايوان
            ],
            
            // بروكسي أوروبية
            europe: [
                "http://88.198.24.108:8080",  // ألمانيا
                "http://95.217.210.191:8080", // ألمانيا
                "http://88.99.134.61:8080",   // ألمانيا
                "http://88.99.134.61:3128",   // ألمانيا
                "http://116.203.28.43:80",    // ألمانيا
                "http://116.203.28.43:8080",  // ألمانيا
                "http://167.172.238.15:10000", // أمريكا (أوروبية الوصول)
                "http://88.198.50.103:8080",  // ألمانيا
                "http://51.15.242.202:8888",  // فرنسا
                "http://138.68.60.8:8080",    // ألمانيا
                "http://94.23.220.136:3128",  // فرنسا
                "http://195.154.67.94:3128",  // فرنسا
                "http://188.166.83.17:3128",  // هونغ كونغ
                "http://178.128.113.118:23128" // اليونان
            ],
            
            // بروكسي عربية
            arabic: [
                "http://197.242.206.64:8080",   // مصر
                "http://41.65.236.57:1981",     // مصر
                "http://41.65.236.58:1981",     // مصر
                "http://102.176.160.84:8080",   // المغرب
                "http://154.73.159.10:8585",    // الجزائر
                "http://154.73.159.253:8585",   // الجزائر
                "http://197.251.194.122:8080",  // تونس
                "http://41.33.66.246:1976",     // مصر
                "http://41.65.236.43:1976",     // مصر
                "http://41.65.236.44:1976",     // مصر
                "http://102.176.160.29:8080",   // المغرب
                "http://102.176.160.30:8080",   // المغرب
                "http://41.33.3.35:1981",       // مصر
                "http://41.33.3.36:1981",       // مصر
                "http://154.73.159.11:8585",    // الجزائر
                "http://154.73.159.12:8585",    // الجزائر
                "http://197.231.196.44:8080",   // المغرب
                "http://197.231.196.45:8080",   // المغرب
                "http://41.65.236.37:1976",     // مصر
                "http://41.65.236.38:1976"      // مصر
            ],
            
            // بروكسي أمريكية
            us: [
                "http://161.35.70.249:8080",    // أمريكا
                "http://167.99.222.214:3128",   // أمريكا
                "http://167.172.180.40:10000",  // أمريكا
                "http://167.172.238.15:10000",  // أمريكا
                "http://45.77.56.114:3128",     // سنغافورة (أمريكية الوصول)
                "http://45.77.63.193:3128",     // سنغافورة (أمريكية الوصول)
                "http://45.77.165.214:3128",    // سنغافورة (أمريكية الوصول)
                "http://157.245.27.9:3128",     // أمريكا
                "http://157.245.27.9:8080",     // أمريكا
                "http://143.198.182.218:80",    // أمريكا
                "http://143.198.182.218:8080",  // أمريكا
                "http://138.68.60.8:8080",      // ألمانيا (أمريكية الوصول)
                "http://161.97.92.88:8800",     // هولندا (أمريكية الوصول)
                "http://88.198.50.103:8080",    // ألمانيا (أمريكية الوصول)
                "http://51.15.242.202:8888"     // فرنسا (أمريكية الوصول)
            ]
        };
        
        this.initializeProxies();
    }
    
    /**
     * تهيئة البروكسيات
     */
    initializeProxies() {
        console.log('🔄 تهيئة مدير VPN/Proxy...');
        
        // تجميع البروكسيات حسب المنطقة
        this.config.preferredRegions.forEach(region => {
            const regionKey = region.toLowerCase();
            if (this.proxySources[regionKey]) {
                this.regions.set(region, this.proxySources[regionKey]);
                
                this.proxySources[regionKey].forEach((proxy, index) => {
                    const proxyId = `${region}_${index}`;
                    this.proxies.set(proxyId, {
                        url: proxy,
                        region: region,
                        lastUsed: null,
                        successCount: 0,
                        failCount: 0,
                        responseTime: null,
                        isActive: true
                    });
                });
            }
        });
        
        // إضافة بروكسيات عامة إذا لم تكن المنطقة محددة
        if (this.regions.size === 0) {
            this.regions.set('global', this.proxySources.free);
            this.proxySources.free.forEach((proxy, index) => {
                const proxyId = `global_${index}`;
                this.proxies.set(proxyId, {
                    url: proxy,
                    region: 'global',
                    lastUsed: null,
                    successCount: 0,
                    failCount: 0,
                    responseTime: null,
                    isActive: true
                });
            });
        }
        
        console.log(`✅ تم تحميل ${this.proxies.size} بروكسي من ${this.regions.size} منطقة`);
        this.regions.forEach((proxies, region) => {
            console.log(`   📍 ${region}: ${proxies.length} بروكسي`);
        });
    }
    
    /**
     * الحصول على بروكسي للمنطقة المحددة
     */
    getProxyForRegion(region = null) {
        if (!this.config.enabled) {
            return null;
        }
        
        // إذا لم يتم تحديد منطقة، استخدم أول منطقة مفضلة
        if (!region && this.config.preferredRegions.length > 0) {
            region = this.config.preferredRegions[0];
        }
        
        // البحث عن بروكسي في المنطقة المطلوبة
        const regionProxies = Array.from(this.proxies.entries())
            .filter(([id, proxy]) => 
                proxy.region === region && 
                proxy.isActive && 
                (proxy.failCount < 3 || Date.now() - (proxy.lastUsed || 0) > 300000)
            );
        
        if (regionProxies.length === 0) {
            // البحث في أي بروكسي نشط
            const allProxies = Array.from(this.proxies.entries())
                .filter(([id, proxy]) => 
                    proxy.isActive && 
                    (proxy.failCount < 3 || Date.now() - (proxy.lastUsed || 0) > 300000)
                );
            
            if (allProxies.length === 0) {
                console.warn('⚠️  لا توجد بروكسيات نشطة متاحة');
                return null;
            }
            
            // اختيار عشوائي
            const randomIndex = Math.floor(Math.random() * allProxies.length);
            const [proxyId, proxy] = allProxies[randomIndex];
            
            proxy.lastUsed = Date.now();
            return {
                url: proxy.url,
                region: proxy.region,
                id: proxyId
            };
        }
        
        // اختيار البروكسي الأقل استخداماً مؤخراً
        regionProxies.sort((a, b) => {
            const timeA = a[1].lastUsed || 0;
            const timeB = b[1].lastUsed || 0;
            return timeA - timeB;
        });
        
        const [proxyId, proxy] = regionProxies[0];
        proxy.lastUsed = Date.now();
        
        return {
            url: proxy.url,
            region: proxy.region,
            id: proxyId
        };
    }
    
    /**
     * اختبار البروكسي
     */
    async testProxy(proxyUrl, timeout = 10000) {
        try {
            const startTime = Date.now();
            
            const response = await axios.get('http://httpbin.org/ip', {
                proxy: {
                    host: proxyUrl.split(':')[1].replace('//', ''),
                    port: parseInt(proxyUrl.split(':')[2]),
                    protocol: proxyUrl.split(':')[0]
                },
                timeout: timeout
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.status === 200 && response.data && response.data.origin) {
                console.log(`✅ بروكسي ${proxyUrl} نشط (${responseTime}ms)`);
                return {
                    success: true,
                    responseTime: responseTime,
                    ip: response.data.origin
                };
            }
        } catch (error) {
            console.log(`❌ بروكسي ${proxyUrl} فاشل: ${error.message}`);
        }
        
        return {
            success: false,
            responseTime: null,
            ip: null
        };
    }
    
    /**
     * اختبار جميع البروكسيات
     */
    async testAllProxies() {
        console.log('🧪 اختبار جميع البروكسيات...');
        
        const testPromises = [];
        const activeProxies = [];
        
        this.proxies.forEach((proxy, proxyId) => {
            testPromises.push(
                this.testProxy(proxy.url).then(result => {
                    if (result.success) {
                        proxy.isActive = true;
                        proxy.responseTime = result.responseTime;
                        proxy.successCount++;
                        activeProxies.push({
                            id: proxyId,
                            url: proxy.url,
                            region: proxy.region,
                            responseTime: result.responseTime
                        });
                    } else {
                        proxy.isActive = false;
                        proxy.failCount++;
                    }
                    
                    return result;
                })
            );
        });
        
        const results = await Promise.allSettled(testPromises);
        
        const activeCount = activeProxies.length;
        const totalCount = this.proxies.size;
        
        console.log(`✅ ${activeCount}/${totalCount} بروكسي نشط`);
        
        // ترتيب البروكسيات حسب السرعة
        activeProxies.sort((a, b) => a.responseTime - b.responseTime);
        
        if (activeProxies.length > 0) {
            console.log('🏆 أسرع 5 بروكسيات:');
            activeProxies.slice(0, 5).forEach((proxy, index) => {
                console.log(`   ${index + 1}. ${proxy.url} (${proxy.region}) - ${proxy.responseTime}ms`);
            });
        }
        
        return {
            total: totalCount,
            active: activeCount,
            fastestProxies: activeProxies.slice(0, 10)
        };
    }
    
    /**
     * تحديث حالة البروكسي
     */
    updateProxyStatus(proxyId, success, responseTime = null) {
        const proxy = this.proxies.get(proxyId);
        
        if (proxy) {
            if (success) {
                proxy.successCount++;
                proxy.responseTime = responseTime;
                proxy.isActive = true;
            } else {
                proxy.failCount++;
                
                // تعطيل البروكسي إذا فشل 3 مرات
                if (proxy.failCount >= 3) {
                    proxy.isActive = false;
                    console.log(`⛔ تم تعطيل البروكسي ${proxyId} بعد 3 فشلات`);
                }
            }
            
            proxy.lastUsed = Date.now();
        }
    }
    
    /**
     * إحصائيات البروكسيات
     */
    getProxyStats() {
        const stats = {
            total: this.proxies.size,
            active: 0,
            byRegion: {}
        };
        
        this.proxies.forEach(proxy => {
            if (proxy.isActive) stats.active++;
            
            if (!stats.byRegion[proxy.region]) {
                stats.byRegion[proxy.region] = { total: 0, active: 0 };
            }
            
            stats.byRegion[proxy.region].total++;
            if (proxy.isActive) stats.byRegion[proxy.region].active++;
        });
        
        return stats;
    }
    
    /**
     * الحصول على إعدادات axios للبروكسي
     */
    getAxiosConfig(proxyInfo) {
        if (!proxyInfo || !this.config.enabled) {
            return {};
        }
        
        try {
            const url = new URL(proxyInfo.url);
            
            return {
                proxy: {
                    host: url.hostname,
                    port: parseInt(url.port),
                    protocol: url.protocol.replace(':', '')
                },
                timeout: this.config.proxyTimeout
            };
        } catch (error) {
            console.error(`❌ خطأ في تحليل بروكسي ${proxyInfo.url}:`, error.message);
            return {};
        }
    }
}

module.exports = { ProxyManager };
