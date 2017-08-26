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

      for (var i = 0; i < body.messages.length; i++) {
        if (body.messages[i].user == event.item_user && body.messages[i].ts == item.ts) {
          message = body.messages[i];
          break;
        }
      }

      if (message) {
        var text = message.text;
        return text;
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
