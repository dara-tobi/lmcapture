const { log, getResourceLinkFromText } = require('.');
const { couldNotRecommend } = require('../constants');


const defaultCallback = (err, httpResponse, body) => err && log('error ', err);

function postMessageToChannel(text, bot_token, channel_id) {
  return request.post({
    url: 'https://slack.com/api/chat.postMessage',
    form: {
      token: bot_token,
      text: text,
      channel: channel_id,
      username: 'resaucebot'
    }
  }, defaultCallback);
}

function sendDirectMessage(reporterDm, userText, bot_token) {
  log('sending direct message');

  const { text, attachments } = userText;
  log('attachments payload', attachments);

  return request.post({
    url: 'https://slack.com/api/chat.postMessage',
    form: {
      token: bot_token,
      text: text || userText,
      attachments: attachments,
      channel: reporterDm,
      username: 'resaucebot'
    }
  }, defaultCallback);
}

function getFourLatestMessagesInUserDm(reporterDm, bot_token, channel_id) {
  log(reporterDm, bot_token, channel_id);

  return request.post({
    url: 'https://slack.com/api/im.history',
    form: {
      token: bot_token,
      channel: reporterDm,
      count: 4
    }
  },
    function (err, httpResponse, body) {
      const body = JSON.parse(body);

      if (err) {
        return log('error ', err);
      }

      if (body.ok) {
        const messages = body.messages;

        if (messages.length === 4) {
          if (messages[0].subtype && messages[0].subtype === 'bot_message' && messages[2].subtype && messages[2].subtype === 'bot_message') {

            const audience = messages[1].text;
            const reporter = messages[1].user;
            const url = getResourceLinkFromText(messages[2].text);

            if (url) {
              const message = `>>> *Resource*: ${url}
*Audience*: ${audience}
*Sent in by: <@${reporter}>`;
              return postMessageToChannel(message, bot_token, channel_id);
            }
          }
          // for the message to be posted to the channel, we need to check if the bot's user interaction flow is complete
          // this flow is complete when
          // 1. there's a url to be recommendeed
          // 2. out of the last four messages in the user's dm, the first message and the 3rd message are from the bot to the user, of which:
          //  i. the first message asks for audience
          //  ii. the 3rd message asks for confirmation of audience and url, before posting the recommendation to the public channel
          return sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
        }
      }
      log('trying to send message, body not okay');
    });
}

function findDirectMessageId(text, reporter, bot_token, linkSentDirectly) {
  return request.post({
    url: 'https://slack.com/api/im.open',
    form: {
      token: bot_token,
      user: reporter
    }
  },
    function (err, httpResponse, body) {
      const body = JSON.parse(body);
      const reporterDm = body.channel.id;
      const url = getResourceLinkFromText(text);
      const messageToSend = linkSentDirectly ?
        `Hi <@${reporter}>, you're recommending ${url}.  What audience would you recommend it to?`
        : `Hi <@${reporter}>, you marked the link ${url} as recommendable. What audience would you recommend it to?`;

      const userText = url ? messageToSend : couldNotRecommend
      return sendDirectMessage(reporterDm, userText, bot_token)
    });
}

function getTwoLatestMessagesInUserDm(reporterDm, bot_token) {
  return request.post({
    url: 'https://slack.com/api/im.history',
    form: {
      token: bot_token,
      channel: reporterDm,
      count: 2
    }
  },
    function (err, httpResponse, _body) {
      const body = JSON.parse(_body);

      if (err) {
        return log('error ', err);
      }

      if (body.ok) {
        const { messages } = body;

        if (messages.length === 2) {
          if (messages[1].subtype && messages[1].subtype === 'bot_message') {
            const text = messages[0].text;
            const expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,6}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
            const regex = new RegExp(expression);
            const t = messages[1].text;
            const url = t.match(regex);

            if (url) {
              url = url[0];
              const confirmation = {
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
              // link not found. Let the user know
              sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
            }
          } else {
            sendDirectMessage(reporterDm, couldNotRecommend, bot_token);
          }
        }

        return null;
      }
    });
}

function sendConfirmationMessage(reporterDm, _text, bot_token) {
  let attachments = null;

  if (text.attachments) {
    attachments = JSON.stringify(text.attachments);
  } else {
    log('no attachments found');
  }

  const { text } = _text;

  return request.post({
    url: 'https://slack.com/api/chat.postMessage',
    form: {
      text: text,
      attachments: attachments,
      token: bot_token,
      channel: reporterDm,
      username: 'resauce'
    }
  }, defaultCallback);
}

function getMessageReactedTo(event, user_token, bot_token) {
  log(event);
  const { item, user: reporter } = event;
  // message timestamps are used as their ids
  const messageTimestamp = item.ts;
  let url = null;

  log('finding message in channel');

  if (item.channel[0].toLowerCase() === 'g') {
    log('reaction made in a group');
    // not sure this is necessary as bots shouldn't have access to private groups... or should they??
    // A: They should @dara_tobi - if they are given the appropriate permission
    url = 'https://slack.com/api/groups.history'
  } else {
    log('reaction made in a channel');
    url = 'https://slack.com/api/channels.history';
  }

  return request.post({
      url: url,
      form: {
        'token': user_token,
        'channel': item.channel,
        'latest': messageTimestamp,
        'inclusive': true,
        'count': 1
      }
    },
    function(err, httpResponse, body) {
      if (err) {
        log('error trying to find message', err);
      }
      const body = JSON.parse(body);
      const message = null;

      if (body.ok) {
        const [message] = body.message;
        if (message) {
          const { text } = message;
          log('reporter: ', reporter);

          // open a dm with the user who reacted to the message
          findDirectMessageId(text, reporter, bot_token);
        } else {
          log('no message in the body');
        }
      } else {
        log('error in the body', body);
      }
    });
}

exports.getFourLatestMessagesInUserDm = getFourLatestMessagesInUserDm;
exports.sendDirectMessage = sendDirectMessage;
exports.findDirectMessageId = findDirectMessageId;
exports.getTwoLatestMessagesInUserDm = getTwoLatestMessagesInUserDm;
exports.getMessageReactedTo = getMessageReactedTo;
