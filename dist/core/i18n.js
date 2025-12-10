const fs = require('fs');
const path = require('path');
module.exports = class I18nManager {
    constructor(defaultLang = 'en') {
        this.translations = {};
        this.defaultLang = defaultLang;
        this.cache = new Map();
        this.loadTranslations();
    }
    loadTranslations() {
        const langDir = path.resolve(process.cwd(), 'lang');
        const files = fs.readdirSync(langDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const lang = file.replace('.json', '');
                const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'));
                this.translations[lang] = content;
            }
        }
    }
    t(lang, key, variables = {}) {
        const value = this.getNestedValue(this.translations[lang], key)
            ?? this.getNestedValue(this.translations[this.defaultLang], key)
            ?? key;
        if (typeof value !== 'string')
            return key;
        return value.replace(/\{(\w+)\}/g, (_, varName) => String(variables[varName] ?? `{${varName}}`));
    }
    tDefault(key, variables = {}) {
        return this.t(this.defaultLang, key, variables);
    }
    getNestedValue(obj, key) {
        return key.split('.').reduce((acc, part) => acc?.[part], obj);
    }
    getAvailableLanguages() {
        return Object.entries(this.translations).map(([lang, data]) => ({
            lang,
            name: data?.langConfig?.name ?? lang,
            flag: data?.langConfig?.flag ?? '',
            short: data?.langConfig?.short ?? lang
        }));
    }
    get(lang) {
        if (!this.cache.has(lang)) {
            this.cache.set(lang, new I18nInstance(lang, this));
        }
        return this.cache.get(lang);
    }
}
class I18nInstance {
    constructor(lang, manager) {
        this.lang = lang;
        this.manager = manager;
    }
    t(key, variables = {}) {
        return this.manager.t(this.lang, key, variables);
    }
    getLang() {
        return this.lang;
    }
}
