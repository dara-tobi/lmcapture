const app = require('./app');
const env = require('./utils/env');


app.post('/slack/auth', function(req, res) {
  log('receiving token');
  log('token: ', req.body.access_token);
  log('bot token: ', req.body.bot.bot_access_token);
});

app.listen(env.PORT || 8000);
