const { ProxyManager } = require('./vpnproxy');

async function testProxies() {
    console.log('🧪 برنامج اختبار البروكسيات\n');
    
    const proxyManager = new ProxyManager({
        enabled: true,
        preferredRegions: ['EU', 'US', 'AR'],
        proxyTimeout: 10000
    });
    
    // اختبار جميع البروكسيات
    const results = await proxyManager.testAllProxies();
    
    console.log('\n✅ انتهى الاختبار');
    console.log(`\n📊 النتائج النهائية:`);
    console.log(`   • البروكسيات الكلية: ${results.total}`);
    console.log(`   • البروكسيات النشطة: ${results.active}`);
    console.log(`   • نسبة النجاح: ${((results.active / results.total) * 100).toFixed(1)}%`);
    
    if (results.fastestProxies && results.fastestProxies.length > 0) {
        console.log('\n🏆 أفضل البروكسيات أداءً:');
        results.fastestProxies.forEach((proxy, index) => {
            console.log(`   ${index + 1}. ${proxy.url} (${proxy.region}) - ${proxy.responseTime}ms`);
        });
    }
    
    // حفظ البروكسيات النشطة في ملف
    const fs = require('fs');
    const activeProxies = results.fastestProxies.map(p => p.url).join('\n');
    fs.writeFileSync('active_proxies.txt', activeProxies);
    
    console.log('\n💾 تم حفظ البروكسيات النشطة في active_proxies.txt');
}

testProxies().catch(console.error);
