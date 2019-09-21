require('dotenv').config();

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  RESAUCE_CLIENT_ID: process.env.resauce_client_id,
  RESAUCE_CLIENT_SECRET: process.env.resauce_client_secret
};
