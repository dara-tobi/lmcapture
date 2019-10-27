const PgNativeClient = require('pg-native');

const env = require('./env');


const client = new PgNativeClient();
client.connectSync(env.DATABASE_URL);

module.exports = client;
