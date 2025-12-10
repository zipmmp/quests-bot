class UserAgentManager {
    constructor(config) {
        this.config = config;
        this.userAgents = {
            // Desktop User Agents - أوروبية
            desktop_eu: [
                // Windows - أوروبية
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                
                // Mac - أوروبية
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
                
                // Linux - أوروبية
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            ],
            
            // Desktop User Agents - عربية
            desktop_ar: [
                // Windows - عربية
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; ar; rv:121.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                
                // Mac - عربية
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                
                // Linux - عربية
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
            ],
            
            // Desktop User Agents - أمريكية
            desktop_us: [
                // Windows - أمريكية
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
                
                // Mac - أمريكية
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
                
                // Chrome OS - أمريكية
                "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ],
            
            // Mobile User Agents - أوروبية
            mobile_eu: [
                // iPhone - أوروبية
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                
                // Android - أوروبية
                "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0",
                "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            ],
            
            // Mobile User Agents - عربية
            mobile_ar: [
                // iPhone - عربية
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
                
                // Android - عربية
                "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; SM-A346B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Android 14; Mobile; ar; rv:121.0) Gecko/121.0 Firefox/121.0"
            ],
            
            // Mobile User Agents - أمريكية
            mobile_us: [
                // iPhone - أمريكية
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
                
                // Android - أمريكية
                "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 14; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Linux; Android 14; SM-S918U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0"
            ],
            
            // Tablet User Agents
            tablet: [
                "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
                "Mozilla/5.0 (Linux; Android 13; SM-X916B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Linux; Android 13; SM-T976B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ]
        };
        
        this.agentStats = new Map();
        this.currentIndex = 0;
    }
    
    /**
     * الحصول على User-Agent
     */
    getUserAgent(region = 'eu', deviceType = 'desktop') {
        const key = `${deviceType}_${region.toLowerCase()}`;
        
        // التحقق من وجود مجموعة User-Agent للمنطقة
        if (!this.userAgents[key] && this.config.regionBasedAgents) {
            // استخدام مجموعة افتراضية إذا لم توجد للمنطقة
            const fallbackKey = deviceType === 'mobile' ? 'mobile_eu' : 'desktop_eu';
            return this.getRandomFromArray(this.userAgents[fallbackKey]);
        }
        
        // إذا كان التدوير معطلاً، استخدام أول واحد
        if (!this.config.rotateAgents) {
            return this.userAgents[key][0];
        }
        
        // اختيار عشوائي
        return this.getRandomFromArray(this.userAgents[key]);
    }
    
    /**
     * اختيار عشوائي من مصفوفة
     */
    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * الحصول على User-Agent بناءً على المنطقة
     */
    getRegionalUserAgent(region) {
        if (!region) {
            region = 'eu'; // افتراضي أوروبي
        }
        
        region = region.toLowerCase();
        
        // تحديد نوع الجهاز
        let deviceType = 'desktop';
        if (this.config.mobileAgents && Math.random() > 0.7) { // 30% فرصة لموبايل
            deviceType = 'mobile';
        }
        
        // التحقق من وجود المنطقة
        const supportedRegions = ['eu', 'us', 'ar', 'ae', 'sa'];
        if (!supportedRegions.includes(region)) {
            region = 'eu'; // افتراضي إذا لم تكن المنطقة مدعومة
        }
        
        return this.getUserAgent(region, deviceType);
    }
    
    /**
     * إنشاء Super Properties لـ Discord
     */
    generateSuperProperties(userAgent, region = 'eu') {
        let os = "Windows";
        let browser = "Chrome";
        
        // تحديد نظام التشغيل والمتصفح من User-Agent
        if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            os = "iOS";
            browser = "Mobile Safari";
        } else if (userAgent.includes('Android')) {
            os = "Android";
            browser = "Chrome";
        } else if (userAgent.includes('Macintosh')) {
            os = "Mac OS";
        } else if (userAgent.includes('Linux')) {
            os = "Linux";
        } else if (userAgent.includes('Firefox')) {
            browser = "Firefox";
        }
        
        const superProps = {
            os: os,
            browser: browser,
            device: "",
            system_locale: this.getLocaleForRegion(region),
            browser_user_agent: userAgent,
            browser_version: "120.0.0.0",
            os_version: "10",
            referrer: "",
            referring_domain: "",
            referrer_current: "",
            referring_domain_current: "",
            release_channel: "stable",
            client_build_number: 999999,
            client_event_source: null
        };
        
        return Buffer.from(JSON.stringify(superProps)).toString('base64');
    }
    
    /**
     * الحصول على locale بناءً على المنطقة
     */
    getLocaleForRegion(region) {
        const locales = {
            'eu': 'en-US',
            'us': 'en-US',
            'gb': 'en-GB',
            'de': 'de-DE',
            'fr': 'fr-FR',
            'es': 'es-ES',
            'it': 'it-IT',
            'nl': 'nl-NL',
            'pl': 'pl-PL',
            'ru': 'ru-RU',
            'tr': 'tr-TR',
            'ar': 'ar-SA',
            'ae': 'ar-AE',
            'sa': 'ar-SA',
            'eg': 'ar-EG',
            'ma': 'ar-MA',
            'tn': 'ar-TN',
            'dz': 'ar-DZ',
            'lb': 'ar-LB'
        };
        
        return locales[region.toLowerCase()] || 'en-US';
    }
    
    /**
     * إحصائيات User-Agent
     */
    getStats() {
        let totalAgents = 0;
        const byRegion = {};
        
        Object.keys(this.userAgents).forEach(key => {
            const count = this.userAgents[key].length;
            totalAgents += count;
            
            const region = key.split('_')[1] || 'unknown';
            if (!byRegion[region]) {
                byRegion[region] = 0;
            }
            byRegion[region] += count;
        });
        
        return {
            totalAgents: totalAgents,
            byRegion: byRegion,
            regions: Object.keys(byRegion)
        };
    }
}

module.exports = { UserAgentManager };
