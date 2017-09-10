var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;
var request = require('request');
var db = require('./db');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getMessage(event, user_token, bot_token)
{
  var item = event.item;
  var latest = item.ts;
  log('finding message in channel');
  request.post({
      url: 'https://slack.com/api/channels.history',
      form: {
        'token': user_token,
        'channel': item.channel,
        'latest': latest,
        'inclusive': true,
        'count': 1
      }
    },
    function(err, httpResponse, body){ 
      var body = JSON.parse(body);
      var message = null;
      log('found message in channel, finding reporter dm');
      if (body.ok) {
        for (var i = 0; i < body.messages.length; i++) {
          if (body.messages[i].user == event.item_user && body.messages[i].ts == item.ts) {
            message = body.messages[i];
            break;
          }
        }

        if (message) {
          var text = message.text;
          var reporter = event.user;
          log('reporter: ', reporter);
          var owner = message.user;

          findDirectMessageId(text, reporter, owner, bot_token);
        }
      }
    });
}

function postMessageToChannel(text, bot_token, channel_id)
{
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: bot_token,
        text: text,
        channel: channel_id,
        username: 'Learning Media Bot'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });

}

function findDirectMessageId(text, reporter, owner, bot_token)
{
  request.post({
      url: 'https://slack.com/api/im.open',
      form: {
        token: bot_token,
        user: reporter
      }
    },
    function (err, httpResponse, body) {
      var body = JSON.parse(body);
      var reporterDm = body.channel.id;
      var url = getResourceLink(text);

      if (url) {
        sendDirectMessage(reporterDm, 'Hi <@' + reporter + '>, you marked the link `'+ url +'` as recommendable. What audience would you recommend the it to?', bot_token);
      } else {
        sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend", bot_token);
      }
    });
}

function sendDirectMessage(reporterDm, text, bot_token)
{
  var attachments = null;

  if (text.text) {
    var text = text.text;
  }

  if (text.attachments) {
    var attachments = text.attachments;
    log('attachments payload', attachments);
  }

  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: bot_token,
        text: text,
        attachments: attachments,
        channel: reporterDm,
        username: 'Learning Media Bot'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });
}

function getFourLatestMessages(reporterDm, bot_token, channel_id) {
  request.post({
      url: 'https://slack.com/api/im.history',
      form: {
        token: bot_token,
        channel: reporterDm,
        count: 4
      }
    },
    function(err, httpResponse, body){
      var body = JSON.parse(body);

      if (body.ok) {
        var messages = body.messages;

        if (messages.length === 4) {
          if (messages[0].subtype && messages[0].subtype === 'bot_message' && messages[2].subtype && messages[2].subtype === 'bot_message') {

            var audience = messages[1].text;
            var url = getResourceLink(messages[2].text);

            if (url) {
              postMessageToChannel("*Resource:* " + url + " \n *Audience:* `" + audience + "`", bot_token, channel_id);
            } else {
              sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend", bot_token);
            }
          } else {
            sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend", bot_token);
          }
        }
      }

      if (err) {
        log('error ', err);
      }
    });
}

function getResourceLink(text) {
  var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  var regex = new RegExp(expression);
  var url = text.match(regex);

  if (url) {
    return url[0];
  }

  return null;
}

function getTwoLatestMessages(reporterDm, bot_token) {
  request.post({
      url: 'https://slack.com/api/im.history',
      form: {
        token: bot_token,
        channel: reporterDm,
        count: 2
      }
    },
    function(err, httpResponse, body){
      var body = JSON.parse(body);
      
      if (body.ok) {
        var messages = body.messages;
        
        if (messages.length === 2) {
          if (messages[1].subtype && messages[1].subtype === 'bot_message') {
            
            var text = messages[0].text;
            var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
            var regex = new RegExp(expression);
            var t = messages[1].text;
            var url = t.match(regex);
            
            if (url) {
              url = url[0];
              var confirmation = {
                  "text": "I\'m going to tag this article with *Recommended Audience:* `" + text + "`. Is that okay?",
                  "attachments": [
                      {
                          "fallback": "Sorry I can't process your recommendation right now",
                          "callback_id": "confirm",
                          "color": "#3AA3E3",
                          "attachment_type": "default",
                          "actions": [
                              {
                                  "name": "yes",
                                  "text": "Yes, go ahead",
                                  "type": "button",
                                  "value": "yes",
                                  "style": "primary"
                              },
                              {
                                  "name": "no",
                                  "text": "No, cancel",
                                  "style": "danger",
                                  "type": "button",
                                  "value": "no"
                              }
                          ]
                      }
                  ]
              };

              sendConfirmationMessage(reporterDm, confirmation, bot_token);
            } else {
              sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend", bot_token);
            }
          } else {
            sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend", bot_token);
          }
        }
      }
      if (err) {
        log('error ', err);
      }
    });
}

function sendConfirmationMessage(reporterDm, text, bot_token) {
  var attachments = null;

  if (text.attachments) {
    attachments = JSON.stringify(text.attachments);
    log('attachments payload', attachments);
  } else {
    log('no attachments found');
  }

  if (text.text) {
    var text = text.text;
  }

  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        text: text,
        attachments: attachments,
        token: bot_token,
        channel: reporterDm,
        username: 'Learning Media Bot'
      }
    },
    function(err, httpResponse, body){
      console.log('received body right after sending request', body);

      if (err) {
        log('error ', err);
      }
    });
}

app.get('/', function (req, res) {
   res.send('hello world');
});

app.post('/slack/auth', function(req, res){
  log('receiving token');
  log('token: ', req.body.access_token);
  log('bot token: ', req.body.bot.bot_access_token);
});

app.get('/slack/auth', function (req, res) {
  // log('received get... body:', req.body);
  log('received code... code:', req.query.code);
  request.post({
      url: 'https://slack.com/api/oauth.access',
      form: {
        code: req.query.code,
        client_id: process.env.resauce_client_id,
        client_secret: process.env.resauce_client_secret
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }

      var body = JSON.parse(body);
      log('body should contain token:', body);

      var user_token = body.access_token;
      var bot_token = body.bot.bot_access_token;
      var teamId = body.team_id;
      var channel_id = body.incoming_webhook.channel_id;
      log('auth accepted, sending details to be saved', teamId, user_token, bot_token, channel_id);
      db.addTokens(teamId, user_token, bot_token, channel_id);

      res.status(200).send('Slack app has been installed, you may now return to slack :)');
    });
});

// app.post('/slack/access', function (req, res) {
//   log('received post... body:', req.body);
// });

// app.get('/slack/auth', function (req, res) {
//   log('receiving code');
//   log('query', req.query.code);

//   res.redirect('https://slack.com/oauth/authorize?&client_id=65743207921.231877010403&scope=reactions:read,chat:write:bot,incoming-webhook,emoji:read,channels:history,im:history,im:read,im:write,bot&redirect_uri=https://lmedia.herokuapp.com/slack/access');

// });

app.post('/slack/reaction', function (req, res, next) {
  log('request body', req.body);
  if (req.body.event) {
    log('team id received, ', req.body.team_id, 'sending team id along for token retrieval');
    // var tokens = db.getTokens(req.body.team_id);
    // if (tokens) {
    //   var user_token = tokens.user_token;
    //   var bot_token = tokens.bot_token;
    //   var channel_id = tokens.channel_id;
    //   log(tokens);
    // } else {
    //   log('no tokens set');
    // }

    var user_token = process.env.test_user;
    var bot_token = process.env.test_bot;
    var channel_id = 'C6X8YFWE5';

    if (req.body.event.type === 'message') {
      if (req.body.event.text) {
        if (req.body.event.user) {
          if (bot_token) {
            if (req.body.event.text.toLowerCase() == 'yes') {
              // get last four messages, in order to retrieve resource and audience to be posted
              getFourLatestMessages(req.body.event.channel, bot_token, channel_id);
            } else if (req.body.event.text.toLowerCase() === 'no') {
              sendDirectMessage(req.body.event.channel, 'Okay, cancelling recommendation', bot_token);
            } else {
              // get last two messages, in order to confirm that the user is actually recommending something
              getTwoLatestMessages(req.body.event.channel, bot_token);
            }
          }
        }
      }
    }

    if (req.body.event.reaction) {
      if (req.body.event.reaction === 'grinning') {
        if (user_token) {
          getMessage(req.body.event, user_token, bot_token);
        } else {
          log('no user token set');
        }
      }
    }
  }

  if (req.body.payload) {
    var body = JSON.parse(body);
    var payload = body.payload;
    var action = payload.actions[0].name;
    if (action === 'yes') {
      sendDirectMessage(payload.channel.id, 'Recommendation sent; thank you!', bot_token);
      getFourLatestMessages(payload.channel.id, bot_token, channel_id);
    } else {
      sendDirectMessage(payload.channel.id, 'Okay, cancelling.', bot_token);
    }
  }

  if (req.body.event || req.body.payload) {
    res.status(200).end();
  }

  if (req.body.challenge) {
    res.send(req.body.challenge);
  }
});

app.listen(process.env.PORT || 8000);
