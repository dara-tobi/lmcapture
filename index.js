var express = require('express');
var app = express();

app.get('/', function (req, res) {
   res.send('hello world');
});

app.get('/slack/reaction', function (req, res){
  console.log(req.params);
  res.send('trying to get slack challenge');
});

app.post('/slack/reaction', function (req, res) {
  console.log(req.params);
  res.send(req.params.challenge);
  res.send({name: 'dara', msg: 'welcome!!'});
  res.send('POST request to homepage');
});

app.listen(process.env.PORT || 8000);
