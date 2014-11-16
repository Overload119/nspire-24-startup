var express         = require('express');
var elasticsearch   = require('elasticsearch');
var config          = require('./config.js');
var bodyParser      = require('body-parser')
var uuid            = require('node-uuid');
var app             = express();
var es              = new elasticsearch.Client({
                        host: 'localhost:9200',
                        log: 'trace'
                      });
var mandrill        = require('mandrill-api/mandrill');
var mandrillClient  = new mandrill.Mandrill(config.MANDRILL_API);

app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));

app.post('/save_user', function(req, res) {
  var params = req.body;
  params.uuid = uuid.v1();

  es.index({
    index: 'users',
    type: 'user',
    id: params.linkedIn.emailAddress,
    body: params
  });
  res.json({ success: true });
});

app.post('/contact', function(req, res) {
  var currentUserEmail = req.body.userEmail;
  var toUserUuid       = req.body.toUserUuid;
  var userMessage      = req.body.message;

  var result = es.search({
    index: 'users',
    type: 'user',
    q: 'uuid:' + toUserUuid,
    size: 1
  }).then(function(body) {
    var sourceResult = body.hits.hits[0];

    var message = {
      html: userMessage,
      text: userMessage,
      subject: 'Someone wants to connect!',
      headers: {
        'Reply-To': currentUserEmail
      },
      from_email: 'orange@getpeeled.ca',
      from_name: 'OrangePeel',
      to: [
        {
          email: sourceResult._source.linkedIn['emailAddress'],
          name: sourceResult._source.linkedIn['firstName'],
          type: 'to'
        }
      ]
    }

    try {
      mandrillClient.messages.send({
        message: message || 'Connect with me!',
        async: false
      });
    } catch(ex) {}

    res.json({ success: true });
  });;


});

app.post('/search', function(req, res) {
  var keywords = req.body.query;
  var currentUserEmail = req.body.userEmail;

  if (keywords == null || keywords.trim() === '') {
    res.json({ success: false, results: [] });
  }

  // TODO Ignore the ID of the given user.
  var result = es.search({
    index: 'users',
    size: 15,
    q: keywords
  }).then(function(body) {
    var sourceResults = body.hits.hits.filter(function(esResult) {
      return esResult._source.linkedIn['emailAddress'] !== currentUserEmail;
    }).map(function(esResult) {
      // Filter out the email address.
      delete esResult._source.linkedIn['emailAddress'];
      return esResult._source;
    });
    res.json({ success: sourceResults.length > 0, results: sourceResults });
  });
});

app.get('/get_users', function(req, res) {
  var currentUserEmail = req.query.userEmail;
  console.log(currentUserEmail);

  es.search({
    index: 'users',
    size: 50
  }).then(function(body) {
    var sourceResults = body.hits.hits.filter(function(esResult) {
      return esResult._source.linkedIn['emailAddress'] !== currentUserEmail;
    }).map(function(esResult) {
      delete esResult._source.linkedIn['emailAddress'];
      return esResult._source;
    });

    res.json({ success: true, results: sourceResults });
  });
});

app.listen(config.PORT);

