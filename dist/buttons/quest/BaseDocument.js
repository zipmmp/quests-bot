var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// src/entities/BaseDocument.js
const { CreateDateColumn, UpdateDateColumn, BaseEntity, ObjectIdColumn, PrimaryGeneratedColumn, ObjectId, Entity } = require('typeorm');
const { SupportedDatabaseTypes } = require('../../../core/databaseConfig.js');
const config = require('../../../config/config.js');
let BaseDocumentSql = class BaseDocumentSql extends BaseEntity {
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], BaseDocumentSql.prototype, "id", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], BaseDocumentSql.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], BaseDocumentSql.prototype, "updatedAt", void 0);
module.exports.BaseDocumentSql = BaseDocumentSql;;
let BaseDocumentMongo = class BaseDocumentMongo extends BaseEntity {
};
__decorate([
    ObjectIdColumn(),
    __metadata("design:type", ObjectId)
], BaseDocumentMongo.prototype, "id", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], BaseDocumentMongo.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], BaseDocumentMongo.prototype, "updatedAt", void 0);
module.exports.BaseDocumentMongo = BaseDocumentMongo;;
// اختار الكلاس حسب نوع قاعدة البيانات
const BaseDocument = config.database.type === SupportedDatabaseTypes.MongoDB
    ? BaseDocumentMongo
    : BaseDocumentSql;
module.exports = BaseDocument;
