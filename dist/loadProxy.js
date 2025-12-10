const fs = require('fs');
const path = require('path');
const { Logger } = require('../core/logger.js');
const { findProjectRoot } = require('./tools.js');
// لم يعد هناك interface في JS، فقط ضع شكل البيانات كملاحظات
// ProxyInterface = { ip: string, authentication: string }
async function readProxy(collection) {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        if (!fs.existsSync(proxyPath)) {
            return console.error("Proxy file not found at:", proxyPath);
        }
        const data = fs.readFileSync(proxyPath, 'utf8');
        const lines = data.split('\n');
        collection.clear(); // مسح البروكسيات القديمة
        for (const line of lines) {
            const splited = line.trim().split(":");
            if (splited.length !== 4) {
                Logger.info("Bad Proxy line: " + line);
                continue;
            }
            collection.set(line, {
                ip: `${splited[0]}:${splited[1]}`,
                authentication: `${splited[2]}:${splited[3]}`,
            });
        }
        Logger.info(`Loaded ${collection.size} proxies successfully.`);
    }
    catch (error) {
        Logger.error("Error reading proxy file:", error);
    }
}
const writeProxy = async (proxies) => {
    try {
        const proxyPath = path.join(findProjectRoot(), 'proxy.txt');
        fs.writeFileSync(proxyPath, proxies, 'utf8');
        Logger.info('Proxies have been written to', proxyPath);
    }
    catch (error) {
        Logger.error('Error writing to proxy file:', error);
    }
};
module.exports = readProxy;
