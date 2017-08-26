var express = require('express');
var app = express();

app.get('/', function (req, res) {
   res.send('hello world');
});

app.get('/slack/reaction', function (req, res){
  console.log(req.params);
  res.send('trying to get slack challenge');
});

app.listen(8000);
