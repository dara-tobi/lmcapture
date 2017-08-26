var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;
var request = require('request');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getMessage(item)
{
  var time = Math.round(item.ts);
  var oldest = time - 1;
  var latest = time + 1;

  log('getting message for item:');
  log(item);

  request.post({
      url: 'https://slack.com/api/channels.history',
      form: {
        'token': process.env.TOKEN,
        'channel': item.channel,
        'oldest': oldest,
        'latest': latest
      }
    },
    function(err,httpResponse,body){ 
      var body = JSON.parse(body);

      for (var i = 0; i < body.messages.length; i++) {
        if (body.messages[i].user == item.item_user && body.messages[i].ts == item.ts) {
          var message = messages[i];
          break;
        }
      }
      if (message) {
        log('found message');
        var text = message.text;
        return "the message reacted to was: " + text;
      } else {
        log('could not find message');
      }
  });
}


app.get('/', function (req, res) {
   res.send('hello world');
});

app.get('/slack/reaction', function (req, res){
  log(req.params);
  res.send('trying to get slack challenge');
});

app.post('/slack/reaction', function (req, res, next) {
  if (req.body.event.reaction) {
    if (req.body.event.reaction === 'grinning') {
      // log('grinning reaction added');
      var item = req.body.event.item;
      log('message: '+ getMessage(item));
      // log(req.body);
    } else {
      log('non grinning reaction added');
    }
  } else {
    log('no event reaction');
    log(req.body);
  }
  res.send(req.body.challenge);
});

app.listen(process.env.PORT || 8000);
