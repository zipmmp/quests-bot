const { fork } = require('child_process');
const path = require('path');
const questsConfig = require('../config/questsConfig.js');
const { findClosestIndexFolder } = require('../utils/tools.js');
const { Logger } = require('./logger.js');
const { Collection } = require('discord.js');
const { client } = require('../index.js');
class ChildManager {
    // collection لحفظ العمليات
    static { this.childProcesses = new Collection(); }
    static async loadChildProcess() {
        const count = questsConfig.childProcessCount;
        for (let i = 0; i < count; i++) {
            this.spawnChild();
        }
    }
    static get maxUsage() {
        return Math.floor(questsConfig.childProcessCount * questsConfig.questsPerChildProcess);
    }
    static get pids() {
        return this.childProcesses.map((c) => c.process.pid);
    }
    static spawnChild() {
        const childPath = path.join(findClosestIndexFolder(), "childProcess", "childProcess.js");
        const child = fork(childPath, [], {
            stdio: ["inherit", "inherit", "inherit", "ipc"],
        });
        child.on("message", (msg) => {
            const type = msg?.type;
            if (type === "ready") {
                Logger.info(`Child process ${child.pid} is ready`);
            }
            else if (type === "process_update") {
                const childInfo = this.childProcesses.get(child.pid);
                if (childInfo) {
                    childInfo.currentTasks = msg.count;
                }
                const totalUsage = this.TotalUsage;
                client.updateActivity();
                Logger.info(`Child process ${child.pid} updated task count to ${msg.count}. Total usage: ${totalUsage}`);
            }
        });
        child.on("exit", (code, signal) => {
            Logger.warn(`Child process ${child.pid} exited with code ${code}, signal ${signal}`);
            this.childProcesses.delete(child.pid);
            // 🔁 Respawn automatically
            Logger.info(`Respawning child process...`);
            this.spawnChild();
        });
        this.childProcesses.set(child.pid, {
            process: child,
            currentTasks: 0,
        });
        Logger.info(`Child process ${child.pid} started`);
    }
    static getChildren() {
        return this.childProcesses;
    }
    static getAvailableChild() {
        let selected = null;
        for (const child of this.childProcesses.values()) {
            if (!selected || child.currentTasks < selected.currentTasks) {
                selected = child;
            }
        }
        return selected?.process ?? null;
    }
    static getLowestUsageChild() {
        let selected = null;
        for (const child of this.childProcesses.values()) {
            if (!selected || child.currentTasks < selected.currentTasks) {
                selected = child;
            }
        }
        return selected;
    }
    static get TotalUsage() {
        let total = 0;
        for (const child of this.childProcesses.values()) {
            total += child.currentTasks;
        }
        return total;
    }
}
