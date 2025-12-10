// src/bootstrap/database.js
const path = require('path');
const config = require('../config/config.js');
const { DatabaseConfig } = require('../core/databaseConfig.js');
const { CustomDataSource } = require('../core/DataSource.js');
const { Logger } = require('../core/logger.js');
const { loadFolder } = require('../handler/folderLoader.js');
const { findClosestIndexFolder } = require('../utils/tools.js');
let AppDataSource; // <-- لا أنواع هنا (JS فقط)
/**
 * Initializes and returns a singleton DataSource (CustomDataSource).
 * If already initialized, returns the existing instance.
 */
export async function initializeDatabase() {
    // إذا موجودة ومهيّأة بالفعل نعيدها مباشرة
    if (AppDataSource && AppDataSource.isInitialized) {
        Logger.debug("AppDataSource already initialized — returning existing instance.");
        return AppDataSource;
    }
    try {
        const entitiesPath = path.join(findClosestIndexFolder(), "entities");
        Logger.info("Loading entities from folder: " + entitiesPath);
        const loadedEntities = await loadFolder(entitiesPath, {
            logger: true,
            shouldReturn: true
        });
        // Filter to include both EntitySchema objects and class-based entities
        const entities = (loadedEntities || []).filter(entity => {
            return entity && (
                entity.constructor?.name === 'EntitySchema' ||
                entity.options !== undefined ||
                typeof entity === 'function'
            );
        });
        Logger.info("Entities loaded: " + (Array.isArray(entities) ? entities.length : 0));
        if (!entities || entities.length === 0) {
            Logger.error("No entities found in the specified folder: " + entitiesPath);
            // بدل أن نغلق العملية فوراً يمكنك رمي خطأ لتُعالَج في مكان أعلى
            process.exit(1);
        }
        const databaseConfig = new DatabaseConfig(config.database);
        // ننشئ DataSource جديد مع خيارات قاعدة البيانات و Entities
        AppDataSource = new CustomDataSource({
            ...databaseConfig.getDataSourceOptions(),
            entities
        });
        await AppDataSource.initialize();
        Logger.info("Database initialized successfully.");
        return AppDataSource;
    }
    catch (error) {
        Logger.error("Error initializing database: " + (error && error.stack ? error.stack : String(error)));
        throw error;
    }
}
// نصدر المتغير ليتم استخدامه في أجزاء التطبيق الأخرى
module.exports.AppDataSource = AppDataSource;;
