var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;

app.use(bodyParser.json());

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
      log('grinning reaction added');
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
