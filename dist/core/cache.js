// caches
const GuildDocument = require('../entities/guildSettings.js');
const ImageEntity = require('../entities/image.js');
const QuestEntity = require('../entities/quests.js');
const UserDocument = require('../entities/userSettings.js');
const { AppDataSource } = require('../index.js');
const { customCollection } = require('../lib/quest/handler/customCollection.js');
const usersCache = new customCollection();
const questsCache = new customCollection();
const guildSettingsRepo = AppDataSource.getRepo(GuildDocument);
const userSettingsRepo = AppDataSource.getRepo(UserDocument);
const imageRepo = AppDataSource.getRepo(ImageEntity);
const questRepo = AppDataSource.getRepo(QuestEntity);
