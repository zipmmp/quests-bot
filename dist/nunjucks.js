const nunjucks = require('nunjucks');
// 🛠️ كلاس fallback للكيز الناقصة
class FallbackUndefined {
    constructor(prop, lookupStr) {
        this.prop = prop;
        this.lookupStr = lookupStr;
    }
    toString() {
        return `{{ ${this.lookupStr || this.prop || "MISSING_KEY"} }}`;
    }
}
// إنشاء Environment
const env = new nunjucks.Environment(undefined, { autoescape: false, noCache: false, throwOnUndefined: false, lstripBlocks: true });
env.addFilter("fallback", function (value, keyName) {
    if (value === null || value === undefined || value === "") {
        return `{{ ${keyName} }}`; // رجع placeholder
    }
    return `${value}`;
}, false);
// تفعيل FallbackUndefined
env.opts.undefined = FallbackUndefined;
env.opts.null = FallbackUndefined;
// 🛠️ دالة تفكّك flat keys -> nested object
function unflatten(obj) {
    const result = {};
    for (const key in obj) {
        key.split(".").reduce((acc, part, i, arr) => {
            if (i === arr.length - 1) {
                acc[part] = obj[key];
            }
            else {
                acc[part] = acc[part] || {};
            }
            return acc[part];
        }, result);
    }
    return result;
}
function addFallbackToTemplate(template) {
    return template.replace(/{{\s*([^}|]+)(.*?)}}/g, (match, key, rest) => {
        // لو فيه fallback لا تلمسه
        if (rest.includes("|fallback")) {
            return match;
        }
        const trimmedKey = key?.trim() ?? "BAD_KEY";
        return `{{ ${trimmedKey}${rest} |fallback("${trimmedKey}") }}`;
    });
}
/**
 * generateMessage
 * @param template {string} القالب النصي بـ Nunjucks
 * @param data {object} البيانات JSON
 * @returns {string} الرسالة الناتجة
 */
function replaceMessageKeysNunjucks(template, data, returnNull = false) {
    try {
        return env.renderString(addFallbackToTemplate(template), unflatten(data));
    }
    catch (err) {
        console.error("Error rendering template:", err);
        if (returnNull)
            return null;
        else
            return "⚠️ Error rendering template";
    }
}
