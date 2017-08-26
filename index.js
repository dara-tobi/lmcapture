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
  var time = Math.round(item.ts);
  var oldest = time - 1;
  var latest = time + 1;

  request.post({
      url: 'https://slack.com/api/channels.history',
      form: {
        'token': process.env.TOKEN,
        'channel': item.channel,
        'oldest': oldest,
        'latest': latest
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

function findDirectMessageId(text, reporter, owner)
{
  request.post({
      url: 'https://slack.com/api/im.list',
      form: {
        token: process.env.TOKEN
      }
    },
    function (err, httpResponse, body) {
      var body = JSON.parse(body);
      var reporterDm = null;

      if (body.ok && body.ims.length > 0) {
        for (var i = 0; i < body.ims.length; i++) {
          if (body.ims[i].user == reporter) {
            var reporterDm = body.ims[i].id;
            log('dm: ', reporterDm);
            break;
          }
        }

        if (!reporterDm) {
          log('could not find reporter Dm');
        }

        sendDirectMessage(text, reporter, owner, reporterDm);
      } else {
        log('body, not ok');
      }
    });
}

function sendDirectMessage(text, reporter, owner, reporterDm) 
{
  log('text: ', text, 'reporter ', reporter, 'owner ', owner, 'reporterDm ', reporterDm);
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.TOKEN,
        text: 'hi <@' + reporter + '>, you marked the message `'+ text +'` as important. So, now, how far?',
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

app.get('/', function (req, res) {
   res.send('hello world');
});

app.get('/slack/reaction', function (req, res){
  log('hi');
});

app.post('/slack/reaction', function (req, res, next) {
  if (req.body.event.reaction) {
    if (req.body.event.reaction === 'grinning') {
      log("message: ", getMessage(req.body.event));
    }
  }
  
  if (req.body.challenge) {
    res.send(req.body.challenge);
  }
});

app.listen(process.env.PORT || 8000);
