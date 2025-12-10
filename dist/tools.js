const fs = require('fs');
import path, { dirname } from "path";
const { fileURLToPath } = require('url');
const humanizeDuration = require('humanize-duration');
const config = require('../config/config.js');
const { ActionRowBuilder, ComponentType, Guild, SnowflakeUtil } = require('discord.js');
const { i18n } = require('../providers/i18n.js');
const numeral = require('numeral');
const axios = require('axios');
const ini = require('ini');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let root = null;
let indexFolder = null;
indexFolder = findClosestIndexFolder();
// ================= Helper Functions =================
function capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
function isObject(val) {
    return typeof val === "object" && val !== null && !Array.isArray(val);
}
// Deep diff between two objects/arrays/primitives
function deepDiff(oldObj, newObj) {
    if (oldObj === newObj)
        return {};
    if (Array.isArray(oldObj) && Array.isArray(newObj)) {
        if (oldObj.every(v => typeof v !== "object") && newObj.every(v => typeof v !== "object")) {
            const removed = oldObj.filter(v => !newObj.includes(v));
            const added = newObj.filter(v => !oldObj.includes(v));
            return { added, removed };
        }
        if (oldObj.every(v => isObject(v) && "id" in v) && newObj.every(v => isObject(v) && "id" in v)) {
            const oldMap = new Map(oldObj.map(v => [v.id, v]));
            const newMap = new Map(newObj.map(v => [v.id, v]));
            const removed = [];
            const added = [];
            const updated = {};
            for (const [id, oldVal] of oldMap.entries()) {
                if (!newMap.has(id)) {
                    removed.push(oldVal);
                }
                else {
                    const nestedDiff = deepDiff(oldVal, newMap.get(id));
                    if (Object.keys(nestedDiff).length > 0) {
                        updated[id] = nestedDiff;
                    }
                }
            }
            for (const [id, newVal] of newMap.entries()) {
                if (!oldMap.has(id))
                    added.push(newVal);
            }
            const result = {};
            if (added.length)
                result.added = added;
            if (removed.length)
                result.removed = removed;
            if (Object.keys(updated).length)
                result.updated = updated;
            return result;
        }
        if (oldObj.length !== newObj.length) {
            return { old: oldObj, new: newObj };
        }
        const diffs = [];
        oldObj.forEach((val, i) => {
            const diff = deepDiff(val, newObj[i]);
            if (Object.keys(diff).length > 0)
                diffs[i] = diff;
        });
        return diffs.length > 0 ? diffs : {};
    }
    if (isObject(oldObj) && isObject(newObj)) {
        const diff = {};
        const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
        for (const key of keys) {
            if (!(key in newObj))
                diff[key] = { old: oldObj[key], new: undefined };
            else if (!(key in oldObj))
                diff[key] = { old: undefined, new: newObj[key] };
            else {
                const nestedDiff = deepDiff(oldObj[key], newObj[key]);
                if (Object.keys(nestedDiff).length > 0)
                    diff[key] = nestedDiff;
            }
        }
        return Object.keys(diff).length > 0 ? diff : {};
    }
    return { old: oldObj, new: newObj };
}
// Retry async function
export async function tryAgain(fn, retries = 3, delayMs = 0) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (attempt < retries && delayMs > 0) {
                await new Promise(res => setTimeout(res, delayMs));
            }
        }
    }
    throw lastError;
}
// Convert date to timestamp or Snowflake ID
function toTimestamp(dateStr, inSeconds = false, id = false) {
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts))
        throw new Error(`Invalid date string: ${dateStr}`);
    let time = inSeconds ? Math.floor(ts / 1000) : ts;
    if (id) {
        if (inSeconds)
            time = time * 1000;
        return SnowflakeUtil.generate({ timestamp: time }).toString();
    }
    return time;
}
// Read JSON file with fallback
function readJsonFile(path, fallback) {
    try {
        if (!fs.existsSync(path)) {
            console.warn(`File not found: ${path}`);
            return fallback;
        }
        const content = fs.readFileSync(path, "utf-8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error reading JSON file at ${path}:`, error);
        return fallback;
    }
}
// Hex to RGB
function hexToRGB(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3)
        hex = hex.split("").map(c => c + c).join("");
    if (hex.length !== 6)
        throw new Error("Invalid hex color format");
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
}
// Find project root folder
function findProjectRoot() {
    if (!root) {
        let dir = __dirname;
        while (!fs.existsSync(path.join(dir, 'package.json'))) {
            const parentDir = path.dirname(dir);
            if (parentDir === dir)
                break;
            dir = parentDir;
        }
        root = dir;
    }
    return root;
}
// Find closest index folder
function findClosestIndexFolder() {
    if (indexFolder)
        return indexFolder;
    let dir = __dirname;
    while (true) {
        if (fs.existsSync(path.join(dir, "index.ts")) || fs.existsSync(path.join(dir, "index.js"))) {
            indexFolder = dir;
            return dir;
        }
        const parentDir = path.dirname(dir);
        if (parentDir === dir)
            break;
        dir = parentDir;
    }
    return null;
}
// Sleep / delay
const delay = ms => new Promise(res => setTimeout(res, ms));
// Extend Guild prototype
Guild.prototype.getI18n = function () {
    return i18n.get(this.getLanguage());
};
// Disable components
function disableComponents(components, defult) {
    return components.map(row => {
        const comps = row.components.map(c => {
            c.data.disabled = true;
            if (c.type === ComponentType.StringSelect && defult && c.data.options.find(d => defult.includes(d.value))) {
                c.data.options = c.data.options.map(o => ({ ...o, default: defult.includes(o.value) }));
            }
            return c;
        });
        return new ActionRowBuilder().setComponents(comps);
    });
}
// Download and parse INI
export async function downloadAndParseIni(url) {
    try {
        const response = await axios.get(url, { responseType: 'text' });
        return ini.parse(response.data);
    }
    catch (error) {
        console.error('Error downloading or parsing INI:', error);
        throw error;
    }
}
function stringifyIni(data) {
    return `;METADATA=(Diff=true, UseCommands=true)\n${ini.stringify(data)}`;
}
// Format readable bytes
function readableBytes(bytes) {
    return numeral(bytes).format("0.0b");
}
// MB to bytes
function mbToBytes(mb) {
    return mb * 1024 * 1024;
}
// Chunk array
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
// Save text / JSON
function saveText(name, content) {
    if (typeof content !== "string")
        content = JSON.stringify(content, null, 2);
    if (!name.includes("."))
        name += ".json";
    name = name.replace(".", "_").toLowerCase().replace("_json", ".json");
    const folderPath = path.join(findProjectRoot(), "json");
    if (!fs.existsSync(folderPath))
        fs.mkdirSync(folderPath);
    const filePath = path.join(folderPath, name);
    fs.writeFileSync(filePath, content, { encoding: "utf8" });
    return filePath;
}
// Set nested value by path
function setByPath(obj, path, value) {
    const keys = path.split(".").filter(Boolean);
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;
        if (isLast)
            current[key] = value;
        else {
            if (typeof current[key] !== "object" || current[key] === null)
                current[key] = {};
            current = current[key];
        }
    }
    return obj;
}
// Mask string
function maskString(str, count, position = "end") {
    const mask = "*".repeat(Math.min(count, str.length));
    return position === "start" ? mask + str.slice(count) : str.slice(0, str.length - count) + mask;
}
// Generate random number with N digits
function generateRandomNumberWithDigits(digits = 4) {
    if (digits < 1)
        throw new Error("Digits must be at least 1");
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Duration formatting
const duration = (time, lang, units = ["y", "mo", "w", "d", "h", "m", "s"]) => humanizeDuration(time, { language: lang || config.defaultLanguage, round: true, units }) || "0";
// Split by lines
function splitByLines(text, maxChunkSize) {
    const lines = text.split("\n");
    const chunks = [];
    let currentChunk = "";
    for (const line of lines) {
        const lineWithBreak = line + "\n";
        if ((currentChunk + lineWithBreak).length > maxChunkSize) {
            if (currentChunk)
                chunks.push(currentChunk);
            if (lineWithBreak.length > maxChunkSize)
                chunks.push(lineWithBreak);
            else
                currentChunk = lineWithBreak;
        }
        else
            currentChunk += lineWithBreak;
    }
    if (currentChunk)
        chunks.push(currentChunk);
    return chunks;
}
// Split by empty lines
function splitByEmptyLines(text, maxChunkSize) {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";
    for (const paragraph of paragraphs) {
        const para = paragraph.trim();
        if (!para)
            continue;
        const withSpacing = currentChunk ? currentChunk + "\n\n" + para : para;
        if (withSpacing.length > maxChunkSize) {
            if (currentChunk)
                chunks.push(currentChunk);
            if (para.length > maxChunkSize)
                chunks.push(para);
            currentChunk = "";
        }
        else
            currentChunk = withSpacing;
    }
    if (currentChunk)
        chunks.push(currentChunk);
    return chunks;
}
// Discord timestamp formatting
const customFormats = {
    Date: ts => `<t:${ts}:d> <t:${ts}:t>`,
};
function formatDiscordTimestamp(timestampMs, styleOrFormat = "R") {
    const timestampSeconds = Math.floor(timestampMs / 1000);
    if (customFormats[styleOrFormat])
        return customFormats[styleOrFormat](timestampSeconds);
    if (['t', 'T', 'd', 'D', 'f', 'F', 'R'].includes(styleOrFormat))
        return `<t:${timestampSeconds}:${styleOrFormat}>`;
    return `<t:${timestampSeconds}:R>`;
}
// Get stars
function getStars(count) {
    return "⭐".repeat(count);
}
// Check word inside parentheses
function hasWordInsideParentheses(text, word) {
    return new RegExp(`\\(${word}\\)`).test(text);
}
// Replace keys with values
function replaceKeysWithValues(data, values, customFuncs = {}) {
    const textTransforms = {
        upper: v => String(v).toUpperCase(),
        lower: v => String(v).toLowerCase(),
        capitalize: v => String(v).replace(/\b\w/g, c => c.toUpperCase()),
        truncate: (v, arg) => String(v).substring(0, arg ? parseInt(arg) : 10),
        date: (v, arg) => v ? (arg ? new Date(v).toISOString().split("T")[0] : new Date(v).toISOString()) : '',
        currency: (v, arg) => `${arg || '$'}${v}`,
        round: (v, arg) => Number(v).toFixed(arg ? parseInt(arg) : 0)
    };
    function getValue(path, obj) {
        let defaultValue = '';
        const defaultMatch = path.match(/\|default=(.*)$/);
        if (defaultMatch) {
            defaultValue = defaultMatch[1];
            path = path.replace(/\|default=.*$/, '');
        }
        const keys = path.split(".");
        let current = obj;
        for (const key of keys)
            current = current?.[key];
        return current ?? defaultValue;
    }
    if (typeof data === "object" && data !== null) {
        if (Array.isArray(data))
            return data.map(item => replaceKeysWithValues(item, values, customFuncs));
        const updated = {};
        for (const key in data)
            updated[key] = replaceKeysWithValues(data[key], values, customFuncs);
        return updated;
    }
    if (typeof data === "string")
        return data.replace(/{([^}]+)}/g, (match, key) => getValue(key, values) ?? match);
    return data;
}
