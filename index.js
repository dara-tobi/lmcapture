var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var log = console.log;
var request = require('request');
var db = require('./pgdb');
var nodemailer = require('nodemailer2');

var couldNotRecommend = "Sorry, I couldn't find the resource you're trying to recommend. \n Add the `:resauce:` reaction to a post (in a public channel) that contains a link to get started.";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getMessage(event, user_token, bot_token)
{
  log(event);
  var item = event.item;
  var latest = item.ts;
  var url = null;

  log('finding message in channel');

  if (item.channel[0].toLowerCase() === 'g') {
    log('reaction made in a group');
    url = 'https://slack.com/api/groups.history'
  } else {
    log('reaction made in a channel');
    url = 'https://slack.com/api/channels.history';
  }

  request.post({
      url: url,
      form: {
        'token': user_token,
        'channel': item.channel,
        'latest': latest,
        'inclusive': true,
        'count': 1
      }
    },
    function(err, httpResponse, body){ 
      if (err) {
        log('error trying to find message', err);
      }
      var body = JSON.parse(body);
      var message = null;

      if (body.ok) {
        if (body.messages[0]) {
          message = body.messages[0];
          var text = message.text;
          var reporter = event.user;
          log('reporter: ', reporter);
          var owner = message.user;

          findDirectMessageId(text, reporter, owner, bot_token);
        } else {
          log('no message in the body');
        }
      } else {
        log('error in the body', body);
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
        username: 'resaucebot'
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
        sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
      }
    });
}

function sendDirectMessage(reporterDm, text, bot_token)
{
  var attachments = null;
  log('sending direct message');
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
        username: 'resaucebot'
      }
    },
    function(err, httpResponse, body){
      if (err) {
        log('error ', err);
      }
    });
}

function getFourLatestMessages(reporterDm, bot_token, channel_id) {
  log(reporterDm, bot_token, channel_id);
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
            var reporter = messages[1].user;
            var url = getResourceLink(messages[2].text);

            if (url) {
              postMessageToChannel("> *Resource*: " + url + " \n> *Audience*: `" + audience + "` \n> Sent in by: <@" + reporter + ">", bot_token, channel_id);
            } else {
              sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
            }
          } else {
            sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
          }
        }
      } else {
        log('trying to send message, body not okay');
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
              sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
            }
          } else {
            sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
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
        username: 'resauce'
      }
    },
    function(err, httpResponse, body){

      if (err) {
        log('error ', err);
      }
    });
}

app.get('/', function (req, res) {
   res.send('<div style="margin: 200px 400px; padding: 50px; box-shadow: 0 0 1px silver; border-radius:7px;"><h3>Install the learning media slack app </h3><p>On the next page, make sure to pick #lm-tech-digest as the channel that the app should post to</p><a href="https://slack.com/oauth/authorize?&client_id=65743207921.238722714675&scope=reactions:read,bot,channels:history,chat:write:bot,im:write,im:read,im:history,emoji:read,incoming-webhook,groups:history"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a></div>');
});

app.post('/slack/auth', function(req, res){
  log('receiving token');
  log('token: ', req.body.access_token);
  log('bot token: ', req.body.bot.bot_access_token);
});

app.get('/slack/auth', function (req, res) {

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
      log('auth response', body);

      if (body.ok) {
        var user_token = body.access_token;
        var bot_token = body.bot.bot_access_token;
        var teamId = body.team_id;
        var channel_id = body.incoming_webhook.channel_id;

        log("tokens received from slack", user_token, bot_token);
        db.addTokens(teamId, user_token, bot_token, channel_id);

        res.status(200).send('<div style="margin: 200px 400px; padding: 50px; box-shadow: 0 0 1px silver; border-radius:7px;"><h3> Slack app has been installed, you may now return to slack :) </h3></div>');
      } else {
        res.send('<div style="margin: 200px 400px; padding: 50px; box-shadow: 0 0 1px silver; border-radius:7px;"><h3> An error occurred while trying to add the app to Slack. Please contact any of the Admins of your Slack team about this :( </h3></div>');
      }
    });
});

function sendTokenNotFoundEmail () {
  var smtpConfig = {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
          user: process.env.mailuser,
          pass: process.env.mailpass
      }
  };

  // create reusable transporter object using the default SMTP transport
  var transporter = nodemailer.createTransport(smtpConfig);

  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: '"CEO Resauce Bot" <wundrefuss@gmail.com>', // sender address
      to: 'daradosu@gmail.com, dara.oladosu@andela.com', // list of receivers
      subject: 'Resauce Bot Error', // Subject line
      text: 'There has been an error in the resauce bot', // plaintext body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });
}

app.post('/slack/reaction', function (req, res, next) {
  if (req.body.event) {
    res.status(200).end();
  }

  if (req.body.event) {
    var timeout = setTimeout(function () {
      var tokens = db.getTokens(req.body.team_id);
      if (tokens) {
        var user_token = tokens.user_token;
        var bot_token = tokens.bot_token;
        var channel_id = tokens.channel_id;
        log(tokens);
      } else {
        log('no tokens set for event task');
        if (req.body.team_id === 'T02R3LKBA') {
          // sendTokenNotFoundEmail();
        }
      }

      // var user_token = process.env.test_user;
      // var bot_token = process.env.test_bot;
      // var channel_id = 'C6X8YFWE5';
      var helpWords = ['hi', 'hey', 'hello', 'help'];

      if (req.body.event.type === 'message') {
        if (req.body.event.text) {
          if (req.body.event.user) {
            if (bot_token) {
              if (req.body.event.text.toLowerCase() == 'yes') {
                // get last four messages, in order to retrieve resource and audience to be posted
                getFourLatestMessages(req.body.event.channel, bot_token, channel_id);
              } else if (req.body.event.text.toLowerCase() === 'no') {
                sendDirectMessage(req.body.event.channel, 'Okay, cancelling recommendation', bot_token);
              } else if (helpWords.indexOf(req.body.event.text.toLowerCase()) !== -1) {
                sendDirectMessage(req.body.event.channel, "Add the `:resauce:` reaction to a post (in a public channel) that contains a link to get started.", bot_token);
              } else {
                // get last two messages, in order to confirm that the user is actually recommending something
                getTwoLatestMessages(req.body.event.channel, bot_token);
              }
            }
          }
        }
      }

      if (req.body.event.reaction) {
        if (req.body.event.reaction === 'resauce' || req.body.event.reaction === 'recommend') {
          if (user_token) {
            getMessage(req.body.event, user_token, bot_token);
          } else {
            log('no user token set');
          }
        }
      }
    }, 1200);
  }

  if (req.body.payload) {
    var payload = JSON.parse(req.body.payload);
    var team = payload.team.id;
    var action = payload.actions[0].name;

    var tokens = db.getTokens(team);
    if (tokens) {
      var user_token = tokens.user_token;
      var bot_token = tokens.bot_token;
      var channel_id = tokens.channel_id;
      log(tokens);
    } else {
      log('no tokens set for payload task');
    }
    // var user_token = process.env.test_user;
    // var bot_token = process.env.test_bot;
    // var channel_id = 'C6X8YFWE5';

    if (action === 'yes') {
      getFourLatestMessages(payload.channel.id, bot_token, channel_id);
      res.send("Recommendation sent; thank you! \n View your recommendation in <#" + channel_id + ">.");
    } else {
      res.send('Okay, cancelling...');
    }

    res.status(200).end();
  }


  if (req.body.challenge) {
    res.send(req.body.challenge);
  }
});

app.listen(process.env.PORT || 8000);
