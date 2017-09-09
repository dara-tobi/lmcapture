var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;
var request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getMessage(event)
{
  var item = event.item;
  var latest = item.ts;

  request.post({
      url: 'https://slack.com/api/channels.history',
      form: {
        'token': process.env.TOKEN,
        'channel': item.channel,
        'latest': latest,
        'inclusive': true,
        'count': 1
      }
    },
    function(err, httpResponse, body){ 
      var body = JSON.parse(body);
      var message = null;

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

          findDirectMessageId(text, reporter, owner);
        }
      }
    });
}

function postMessageToChannel(text)
{
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.BOT_TOKEN,
        text: text,
        channel: '#lkgt',
        username: 'The Media Bot'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });

}

function findDirectMessageId(text, reporter, owner)
{
  request.post({
      url: 'https://slack.com/api/im.open',
      form: {
        token: process.env.BOT_TOKEN,
        user: reporter
      }
    },
    function (err, httpResponse, body) {
      var body = JSON.parse(body);
      var reporterDm = body.channel.id;
      var url = getResourceLink(text);

      if (url) {
        sendDirectMessage(reporterDm, 'Hi <@' + reporter + '>, you marked the resource `'+ url +'` as recommendable. What audience would you recommend the resource to?');
      } else {
        sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend");
      }
    });
}

function sendDirectMessage(reporterDm, text) 
{
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.BOT_TOKEN,
        text: text,
        channel: reporterDm,
        username: 'The Media Bot'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });
}

function getFourLatestMessages(reporterDm) {
  request.post({
      url: 'https://slack.com/api/im.history',
      form: {
        token: process.env.BOT_TOKEN,
        channel: reporterDm,
        count: 4
      }
    },
    function(err, httpResponse, body){
      var body = JSON.parse(body);

      if (body.ok) {
        var messages = body.messages;

        if (messages.length === 4) {
          if (messages[1].subtype && messages[1].subtype === 'bot_message' && messages[3].subtype && messages[3].subtype === 'bot_message') {

            var audience = messages[2].text;
            var url = getResourceLink(messages[3].text);

            if (url) {
              postMessageToChannel("*Resource:* " + url + " \n *Audience:* `" + audience + "`");
            } else {
              sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend");
            }
          } else {
            sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend");
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

function getTwoLatestMessages(reporterDm) {
  request.post({
      url: 'https://slack.com/api/im.history',
      form: {
        token: process.env.BOT_TOKEN,
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
              sendDirectMessage(reporterDm, 'I\'m going to tag this article with *Recommended Audience:* `' + text + '`. Is that okay?');
            } else {
              sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend");
            }
          } else {
            sendDirectMessage(reporterDm, "Sorry, I couldn't find the resource you're trying to recommend");
          }
        }
      }
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

app.get('/slack/access', function (req, res) {
  log('received get... body:', req.body);
});

app.post('/slack/access', function (req, res) {
  log('received post... body:', req.body);
});

app.get('/slack/auth', function (req, res) {
  log('receiving code');
  log('query', req.query.code);
  log('body', req.body);
  res.redirect('https://slack.com/oauth/authorize?&client_id=65743207921.231877010403&scope=reactions:read,chat:write:bot,incoming-webhook,emoji:read,channels:history,im:history,im:read,im:write,bot&redirect_uri=https://lmedia.herokuapp.com/slack/access');
  // request.post({
  //     url: 'https://slack.com/api/oauth.access',
  //     form: {
  //       code: req.query.code,
  //       scope: 'https://slack.com/oauth/authorize?&client_id=65743207921.231877010403&scope=reactions:read,chat:write:bot,incoming-webhook,emoji:read,channels:history,im:history,im:read,im:write,bot',
  //       client_id: '65743207921.231877010403',
  //       client_secret: process.env.client_secret,
  //       redirect_uri: 'https://lmedia.herokuapp.com/slack/access'
  //     }
  //   },
  //   function(err, httpResponse, body){
  //     if (err) {
  //       log('error ', err);
  //     }
  //   });

});

app.post('/slack/reaction', function (req, res, next) {
  log(req.body);
  if (req.body.event.type === 'message') {
    if (req.body.event.text) {
      if (req.body.event.user) {
        if (req.body.event.text.toLowerCase() == 'yes') {
          // get last four messages, in order to retrieve resource and audience to be posted
          getFourLatestMessages(req.body.event.channel);
        } else if (req.body.event.text.toLowerCase() === 'no') {
          sendDirectMessage(req.body.event.channel, 'Okay, cancelling recommendation');
        } else {
          // get last two messages, in order to confirm that the user is actually recommending something
          getTwoLatestMessages(req.body.event.channel);
        }
      }
    }
  }

  if (req.body.event.reaction) {
    if (req.body.event.reaction === 'grinning') {
      getMessage(req.body.event);
    }
  }

  if (req.body.event) {
    res.status(200).send('OK');
  }
  
  if (req.body.challenge) {
    res.send(req.body.challenge);
  }

  log('request body', req.body);
});

app.listen(process.env.PORT || 8000);
