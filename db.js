var Database = require('better-sqlite3');
var db = new Database('lmedia.db');
var log = console.log;
 
function deleteTokens (team_id) {
  log("deleting token");
  var deleteRow = db.prepare("delete from tokens where team_id='" + team_id + "'");
  deleteRow.run();
}

function deleteTable () {
  log("deleting tokens table");
  var deleteTable = db.prepare("drop table tokens");
  deleteTable.run();
}

function getOrCreateTokensTable () {
  var tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tokens'");

  if (!tables.get()) {
    log('creating tokens table');
    var query = db.prepare("create table tokens (team_id VARCHAR (25), user_token VARCHAR (255), bot_token VARCHAR (255), channel_id VARCHAR(15))");
    query.run();
  }
}

function addTokens (team_id, user_token, bot_token, channel_id) {
  if (getTokens(team_id)) {
    log("updating tokens");
    updateTokens(team_id, user_token, bot_token);
  } else {
    log("inserting tokens");
    var insert = db.prepare("insert into tokens values ($team_id, $user_token, $bot_token, $channel_id)");
    insert.run({
      team_id: team_id,
      user_token: user_token,
      bot_token: bot_token  ,
      channel_id: channel_id
    });
  }
}

function getTokens (team_id) {
  var row = db.prepare("SELECT * FROM tokens where team_id='" + team_id + "'");
  var result = row.get();
  return result;
}

function updateTokens (team_id, user_token, bot_token) {
  var update = db.prepare("update tokens set bot_token='" + bot_token + "', user_token = '" + user_token + "' where team_id='" + team_id + "'");
  update.run();
}

function getAllTokens () {
   var getAll = db.prepare("select * from tokens");
   return getAll.all();
}


module.exports = {
  addTokens: addTokens,
  getTokens: getTokens
}

