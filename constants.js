const getStartedMessage = "To get started, send me a link or add the `:resauce:` reaction to a post (in a public channel) that contains a link.";
exports.getStartedMessage = getStartedMessage;

exports.couldNotRecommend = `Sorry, I couldn't find the resource you're trying to recommend. \n ${getStartedMessage}`;

exports.slackOauthUrl = 'https://slack.com/api/oauth.access';

exports.helpWords = ['hi', 'hey', 'hello', 'help'];
