const client = require('./client');
const { log } = require('.');


function deleteTokens (teamId) {
  log("deleting team");
  client.querySync(`DELETE FROM teams WHERE team_id = '${teamId}';`);
}

function deleteTeamsTable() {
  log("deleting teams table");
  client.querySync("DROP TABLE teams");
}

function getOrCreateTeamsTable() {
  log('creating teams table');
  client.querySync("CREATE TABLE IF NOT EXISTS teams (team_id VARCHAR (25), user_token VARCHAR (255), bot_token VARCHAR (255), channel_id VARCHAR(15))");
}

function addTokens(team_id, user_token, bot_token, channel_id) {
  const teamToken = getTokens(team_id);
  if (teamToken) {
    log("updating team");
    updateTokens(team_id, user_token, bot_token, channel_id);
  } else {
    log("inserting team");
    const insertStmt = `INSERT INTO teams VALUES ('${team_id}', '${user_token}', '${bot_token}', '${channel_id}');`;
    client.querySync(insertStmt);
    log('getting team', getTokens(team_id));
  }
}

function getTokens(team_id) {
  log("getting tokens for team", team_id);
  const result = client.querySync(`SELECT * FROM teams WHERE team_id = '${team_id}'`);
  log('result', result);

  return result.length > 0 ? result[0] : null;
}

function updateTokens (team_id, user_token, bot_token) {
  log('updating tokens')
  const updateStmt = `UPDATE teams SET bot_token = '${bot_token}', user_token = '${user_token}' WHERE team_id = '${team_id}';`;
  client.querySync(updateStmt);
}

function getAllTokens () {
   const allTokens = client.querySync("SELECT * FROM teams");
   return allTokens;
}

function refreshTokensTable () {
  deleteTable();
  getOrCreateTokensTable(); // couldn't find this method in the original code
}

exports.addTokens = addTokens;
exports.getTokens = getTokens;
