const { initializeDatabase } = require('./providers/appDataSource.js');
const botCLient = require('./providers/client.js');
const AppDataSource = await initializeDatabase();
const client = botCLient;
