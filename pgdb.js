var log = console.log;
var Client = require('pg-native');
 
var client = new Client()
client.connectSync(process.env.DATABASE_URL);

function deleteTokens (team_id) {
  log("deleting team");
  client.querySync("delete from teams where team_id='" + team_id + "'");
}

function deleteTeamsTable () {
  log("deleting teams table");
  client.querySync("drop table teams");
}

function getOrCreateTeamsTable () {
  log('creating teams table');
  client.querySync("Create table if not exists teams (team_id VARCHAR (25), user_token VARCHAR (255), bot_token VARCHAR (255), channel_id VARCHAR(15))");
}

function addTokens (team_id, user_token, bot_token, channel_id) {
  if (getTokens(team_id)) {
    log("updating team");
    updateTokens(team_id, user_token, bot_token, channel_id);
  } else {
    log("inserting team");
    var insert = client.querySync("insert into teams values ('" + team_id + "', '" + user_token + "', '" + bot_token + "', '" + channel_id + "')");
    log('getting team', getTokens(team_id));
  }
}

function getTokens (team_id) {
  log("getting tokens for team", team_id);
  var result = client.querySync("SELECT * FROM teams where team_id='" + team_id + "'");
  log('result', result);
  
  if (result.length) {
    return result[0];
  }

  return null;
}

function updateTokens (team_id, user_token, bot_token) {
  log('updating tokens')
  var update = client.querySync("update teams set bot_token='" + bot_token + "', user_token = '" + user_token + "' where team_id='" + team_id + "'");
}

function getAllTokens () {
   var allTokens = client.querySync("select * from teams");
   return allTokens;
}

function refreshTokensTable () {
  deleteTable();
  getOrCreateTokensTable();
}

getOrCreateTeamsTable();

module.exports = {
  addTokens: addTokens,
  getTokens: getTokens
}
