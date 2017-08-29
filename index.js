var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;
var request = require('request');
// var Sequelize = require('sequelize');

// const sequelize = new Sequelize('', '', '', {
//   host: 'localhost',
//   dialect: 'sqlite',

//   pool: {
//     max: 5,
//     min: 0,
//     idle: 10000
//   },

//   // SQLite only
//   storage: 'database.sqlite'
// });

// sequelize
//   .authenticate()
//   .then(() => {
//     console.log('Connection has been established successfully.');
//   })
//   .catch(err => {
//     console.error('Unable to connect to the database:', err);
//   });


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

function postMessageToChannel(text)
{
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.TOKEN,
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
        token: process.env.TOKEN,
        user: reporter
      }
    },
    function (err, httpResponse, body) {
      var body = JSON.parse(body);
      var reporterDm = body.channel.id;

      sendDirectMessage(text, reporter, owner, reporterDm);
    });
}

function sendDirectMessage(text, reporter, owner = null, reporterDm) 
{
  log('text: ', text, 'reporter ', reporter, 'owner ', owner, 'reporterDm ', reporterDm);
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.TOKEN,
        text: 'Hi <@' + reporter + '>, you marked the resource `'+ text +'` as recommendable. What audience would you recommend the resource to?',
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

function sendconfirmationMessage(text, reporterDm) 
{
  request.post({
      url: 'https://slack.com/api/chat.postMessage',
      form: {
        token: process.env.TOKEN,
        text: 'I\'m going to tag this article with *Recommended Audience:* `' + text + '`. Is that okay?',
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

// app.get('/slack/reaction', function (req, res){
//   log('hi');
// });
// 
app.post('/slack/auth', function(req, res){
  log('receiving token');
  log('token: ', req.body.token);
});

app.get('/slack/auth', function (req, res) {
  log('receiving code');
  log(req.query.code);
  request.post({
      url: 'https://slack.com/api/oauth.access',
      form: {
        code: req.query.code,
        client_id: '65743207921.231877010403',
        client_secret: process.env.client_secret,
        redirect_uri: 'https://lmedia.herokuapp.com/slack/auth'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });

});

app.post('/slack/reaction', function (req, res, next) {
  if (req.body.event.type === 'message') {
    if (req.body.event.text) {
      if (req.body.event.user) {
        if (req.body.event.text.toLowerCase() == 'yes') {
          postMessageToChannel("*Resource:* https://medium.com/@phabbs/dont-suck-at-design-b506abd99f2 \n *Audience:* `Junior devs`");
        } else {
          var text = req.body.event.text;
          var reporterDm = req.body.event.channel;

          sendconfirmationMessage(text, reporterDm);
        }
      }

    }
  }

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
