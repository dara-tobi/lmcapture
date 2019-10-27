const app = require('./app');
const env = require('./utils/env');
const log = require('./utils');
const { slackOauthUrl } = require('./constants');
const { handleOauthAction, handleReactionPayload, handleReactionEvent } = require('./utils/slack');
const { getOrCreateTeamsTable } = require('./utils/database');
const { getFourLatestMessagesInUserDm } = require('./utils/messages');


app.post('/slack/auth', function(req, res) {
  log('receiving token');
  log('token: ', req.body.access_token);
  log('bot token: ', req.body.bot.bot_access_token);
});

app.get('/slack/auth', function(req, res) {
  const form = {
    code: req.query.code,
    client_id: env.RESAUCE_CLIENT_ID,
    client_secret: env.RESAUCE_CLIENT_SECRET
  };

  return request.post({ url: slackOauthUrl, form },
    function(err, httpResponse, body) {
      if (err) {
        log('error ', err);
      }

      const body = JSON.parse(body);
      log('auth response', body);

      return body.ok ? handleOauthAction(body, res) : res.render('error');
    });
});

app.get('/', (req, res) => res.render('index'));

app.post('/slack/reaction', function(req, res) {
  const { challenge, event, payload } = req.body;

  if (!event) return res.status(200).end();

  if (event) {
    setTimeout(() => handleReactionEvent(event), 1200);
    return res.send();
  }

  if (payload) {
    const parsedPayload = JSON.parse(payload);
    return handleReactionPayload(parsedPayload, res)
  }


  if (challenge) return res.send(challenge);
});

getOrCreateTeamsTable();
app.listen(env.PORT || 8000);
