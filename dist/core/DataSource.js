const { DataSource, LessThan, Like, } = require('typeorm');
const { BaseDocumentMongo, BaseDocumentSql } = require('../lib/quest/handler/BaseDocument.js');
const config = require('../config/config.js');
const { SupportedDatabaseTypes } = require('./databaseConfig.js');
const { Logger } = require('./logger.js');
const { ObjectId } = require('mongodb');
class CustomDataSource extends DataSource {
    constructor(options) {
        super(options);
    }
    smartLessThan(value) {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            return { $lte: value };
        }
        else {
            return LessThan(value);
        }
    }
    getRepo(entity) {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            return this.getMongoRepository(entity);
        }
        return this.getRepository(entity);
    }
    getSpecificRepo(entities) {
        const flatEntities = entities.flat();
        const correctEntity = flatEntities.find((entity) => {
            const proto = entity.prototype;
            if (config.database.type === SupportedDatabaseTypes.MongoDB) {
                return proto instanceof BaseDocumentMongo;
            }
            else {
                return proto instanceof BaseDocumentSql;
            }
        });
        if (!correctEntity) {
            Logger.error("No matching entity found for the current database type.");
        }
        return this.getRepo(correctEntity);
    }
    smartId(id) {
        if (config.database.type === SupportedDatabaseTypes.MongoDB) {
            if (!(id instanceof ObjectId) && typeof id === "string") {
                id = new ObjectId(id);
            }
            return { _id: id };
        }
        return { id: id };
    }
    getSmartWhereClause(field, value) {
        const isMongo = config?.database?.type === SupportedDatabaseTypes.MongoDB;
        if (isMongo) {
            return { [field]: value };
        }
        else {
            return [
                { [field]: Like(`${value},%`) }, // starts with
                { [field]: Like(`%,${value},%`) }, // middle
                { [field]: Like(`%,${value}`) }, // end
                { [field]: `${value}` }, // only
            ];
        }
    }
}
