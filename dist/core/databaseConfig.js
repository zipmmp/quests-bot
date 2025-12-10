/**
 * Supported database types
 */
const SupportedDatabaseTypes = {
    Sqlite: "sqlLite",
    Mysql: "mysql",
    MongoDB: "mongoDB",
};
/**
 * DatabaseConfig class
 */
class DatabaseConfig {
    constructor(config) {
        this.config = config;
        this.type = config.type;
        if (config.type === SupportedDatabaseTypes.Sqlite) {
            this.path = config.path;
        }
        else if (config.type === SupportedDatabaseTypes.Mysql) {
            this.host = config.host;
            this.port = config.port;
            this.user = config.user;
            this.password = config.password;
            this.database = config.database;
        }
        else if (config.type === SupportedDatabaseTypes.MongoDB) {
            this.url = config.url;
        }
    }
    getDatabaseType() {
        switch (this.type) {
            case SupportedDatabaseTypes.Sqlite:
                return "sqlite";
            case SupportedDatabaseTypes.Mysql:
                return "mysql";
            case SupportedDatabaseTypes.MongoDB:
                return "mongodb";
        }
    }
    getDataSourceOptions() {
        if (this.type === SupportedDatabaseTypes.MongoDB) {
            /** @type {MongoConnectionOptions} */
            const options = {
                type: "mongodb",
                url: this.url,
                synchronize: true,
                migrationsRun: true,
            };
            return options;
        }
        if (this.type === SupportedDatabaseTypes.Sqlite) {
            /** @type {SqliteConnectionOptions} */
            const options = {
                type: "sqlite",
                database: this.path,
                synchronize: true,
                migrationsRun: true,
            };
            return options;
        }
        /** @type {MysqlConnectionOptions} */
        const options = {
            type: "mysql",
            host: this.host,
            port: this.port,
            username: this.user,
            password: this.password,
            database: this.database,
            synchronize: false,
            migrationsRun: true,
        };
        return options;
    }
}
