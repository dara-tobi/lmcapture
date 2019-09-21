const db = require('./database');
const { getResourceLinkFromText } = require('.')
const {
  getFourLatestMessagesInUserDm,
  sendDirectMessage,
  findDirectMessageId,
  getTwoLatestMessagesInUserDm,
  getMessageReactedTo
} = require('./messages');


exports.handleOauthAction = function (body, res) {
  const user_token = body.access_token;
  const bot_token = body.bot.bot_access_token;
  const teamId = body.team_id;
  const channel_id = body.incoming_webhook.channel_id;

  log("tokens received from slack", user_token, bot_token);
  db.addTokens(teamId, user_token, bot_token, channel_id);

  return res.render('success');
}

exports.handleReactionPayload = function (payload, res) {
  const team = payload.team.id;
  const action = payload.actions[0].name;

  const tokens = db.getTokens(team);

  if (tokens) {
    const { bot_token, channel_id } = tokens;
    log(tokens);

    if (action !== 'yes') return res.send('Okay, cancelling...');

    // user just confirmed that the bot should post the resource
    getFourLatestMessagesInUserDm(payload.channel.id, bot_token, channel_id);
    const response = `Recommendation sent; thank you! \n View your recommendation in <#${channel_id}>.`;
    return res.send(response);
  }

  log('no tokens set for payload task');
  return res.status(200).end();
}

exports.handleReactionEvent = function (event, res) {
  const tokens = db.getTokens(req.body.team_id);

  if (!tokens) {
    return log('no tokens set for event task');
  }

  const { user_token, bot_token, channel_id } = tokens;
  log(tokens);

  if (event.type === 'message' && event.text && req.body.event.user && bot_token) {
    if (getResourceLinkFromText(event.text)) {
      findDirectMessageId(event.text, event.user, bot_token, true);
    } else if (event.text.toLowerCase() === 'yes') {
      // get last four messages, in order to retrieve resource and audience to be posted
      getFourLatestMessagesInUserDm(req.body.event.channel, bot_token, channel_id);
    } else if (req.body.event.text.toLowerCase() === 'no') {
      sendDirectMessage(req.body.event.channel, 'Okay, cancelling recommendation', bot_token);
    } else if (helpWords.indexOf(req.body.event.text.toLowerCase()) !== -1) {
      sendDirectMessage(req.body.event.channel, getStartedMessage, bot_token);
    } else {
      // get last two messages, in order to confirm that the user is actually recommending something
      getTwoLatestMessagesInUserDm(req.body.event.channel, bot_token);
    }
  }

  if (user_token) {
    if (req.body.event.reaction && (req.body.event.reaction === 'resauce' || req.body.event.reaction === 'recommend')) {
      getMessageReactedTo(req.body.event, user_token, bot_token);
    }
  } else {
    log('no user token set');
  }
}
