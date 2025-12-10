const { Collection } = require('discord.js');
const { Logger } = require('../../core/logger.js');
const { client } = require('../../index.js');
class customCollection extends Collection {
    constructor() {
        super();
        this.timeouts = new Map();
    }
    tempSet(key, value, time = client.clientMs("30m")) {
        this.set(key, value);
        // clear old timeout if exists
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
        }
        if (time >= Number.MAX_SAFE_INTEGER) {
            Logger.warn(`Time for tempSet is too long: ${time}ms, it may cause memory issues.`);
            return;
        }
        // create new timeout
        const timeout = setTimeout(() => {
            this.delete(key);
            this.timeouts.delete(key);
        }, time);
        this.timeouts.set(key, timeout);
    }
    autoSet(key, value) {
        this.tempSet(key, value, client.clientMs("10m"));
    }
    // optional: cleanup timeout when manually deleting
    delete(key) {
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
            this.timeouts.delete(key);
        }
        return super.delete(key);
    }
    // optional: cleanup all
    clear() {
        for (const timeout of this.timeouts.values()) {
            clearTimeout(timeout);
        }
        this.timeouts.clear();
        super.clear();
    }
}
