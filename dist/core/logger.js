const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { Logtail } = require('@logtail/node');
const { LogtailTransport } = require('@logtail/winston');
const path = require('path');
const { fileURLToPath } = require('url');
const util = require('util');
const chalk = require('chalk');
const config = require('../config/config.js');
class Logger {
    // JS لا يدعم private أو type annotations
    static { this.logger = Logger.createLogger(); }
    static createLogger() {
        const fileTransport = new DailyRotateFile({
            filename: "logs/%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "5",
        });
        const customConsoleFormat = winston.format.printf((info) => {
            const { level, message } = info;
            const time = new Date();
            const timeStr = chalk.gray(`[${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}]`);
            let tagColored = "";
            switch (level) {
                case "info":
                    tagColored = chalk.green(`[LOG]`);
                    break;
                case "warn":
                    tagColored = chalk.yellow(`[WARN]`);
                    break;
                case "error":
                    tagColored = chalk.red(`[ERROR]`);
                    break;
                case "debug":
                    tagColored = chalk.magenta(`[DEBUG]`);
                    break;
                default:
                    tagColored = chalk.white(`[${level.toUpperCase()}]`);
                    break;
            }
            let formattedMsg = typeof message === "object"
                ? util.inspect(message, { depth: null, colors: true })
                : message;
            const source = info.source ? chalk.blue(info.source) : chalk.blue("[unknown]");
            return `${timeStr} ${tagColored} ${source} ${formattedMsg}`;
        });
        const consoleTransport = new winston.transports.Console({
            format: customConsoleFormat,
        });
        const logger = winston.createLogger({
            level: "info",
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
            defaultMeta: { service: "discord-bot" },
            transports: [fileTransport],
            exitOnError: false,
        });
        logger.exceptions.handle(new winston.transports.File({ filename: "logs/exceptions.log" }));
        logger.rejections.handle(new winston.transports.File({ filename: "logs/rejections.log" }));
        logger.on("error", (err) => {
            console.error("Logger internal error:", err);
        });
        if (process.env.NODE_ENV !== "production") {
            logger.add(consoleTransport);
        }
        if (process.env.LOGTAIL_ENABLE === "true") {
            try {
                const token = process.env.LOGTAIL_SOURCE_TOKEN;
                const endpoint = process.env.LOGTAIL_INGESTION_HOST;
                if (!token || token.length <= 1)
                    throw new Error("Logtail token missing");
                if (!endpoint || !endpoint.includes("https://"))
                    throw new Error("Logtail endpoint invalid");
                const logtail = new Logtail(token, { endpoint });
                logger.add(new LogtailTransport(logtail, { level: "info" }));
            }
            catch (error) {
                console.error("Failed to initialize Logtail:", error);
            }
        }
        return logger;
    }
    static getCallerFile() {
        try {
            const originalFunc = Error.prepareStackTrace;
            const err = new Error();
            Error.prepareStackTrace = (_, stack) => stack;
            const stack = err.stack;
            Error.prepareStackTrace = originalFunc;
            const caller = stack[3];
            let fileName = caller?.getFileName();
            const line = caller?.getLineNumber();
            if (fileName) {
                if (fileName.startsWith("file://")) {
                    fileName = fileURLToPath(fileName);
                }
                fileName = path.relative(process.cwd(), fileName);
                return `[${fileName}:${line}]`;
            }
        }
        catch { }
        return "[unknown]";
    }
    static formatArgs(args) {
        return args
            .map((arg) => (typeof arg === "object" ? util.inspect(arg, { depth: null, colors: true }) : String(arg)))
            .join(" ");
    }
    static info(...args) {
        const message = this.formatArgs(args);
        this.logger.info(message, { source: this.getCallerFile() });
    }
    static error(...args) {
        const message = this.formatArgs(args);
        this.logger.error(message, { source: this.getCallerFile() });
    }
    static warn(...args) {
        const message = this.formatArgs(args);
        this.logger.warn(message, { source: this.getCallerFile() });
    }
    static debug(...args) {
        const message = this.formatArgs(args);
        if (config?.debugMode === true)
            this.logger.info(message, { source: this.getCallerFile() });
        this.logger.debug(message, { source: this.getCallerFile() });
    }
}
// Handle unhandled rejections and exceptions
process.on("unhandledRejection", (reason) => {
    Logger.error("Unhandled rejection", reason);
});
process.on("uncaughtException", (err) => {
    Logger.error("Uncaught exception", err);
});
