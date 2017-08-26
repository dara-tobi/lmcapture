var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.json());

app.get('/', function (req, res) {
   res.send('hello world');
});

app.get('/slack/reaction', function (req, res){
  console.log(req.params);
  res.send('trying to get slack challenge');
});

app.post('/slack/reaction', function (req, res, next) {
  console.log(req.body);
  res.send(req.body.challenge);
});

app.listen(process.env.PORT || 8000);
