var express       = require('express');
var elasticsearch = require('elasticsearch');
var config        = require('./config.js');
var bodyParser    = require('body-parser')
var app           = express();
var es            = new elasticsearch.Client({
                      host: 'localhost:9200',
                      log: 'trace'
                    });

app.use(bodyParser.json())
app.use(express.static(__dirname + '/public'));

app.post('/save_user', function(req, res) {
  var params = req.body;
  es.index({
    index: 'users',
    type: 'user',
    id: params.linkedIn.emailAddress,
    body: params
  });
  res.json({ success: true });
});

app.post('/search', function(req, res) {
  var keywords = req.body.query;
  var currentUserEmail = req.body.userEmail;

  // TODO Ignore the ID of the given user.
  var result = es.search({
    index: 'users',
    size: 30,
    query: { q: keywords }
  }).then(function(body) {
    var sourceResults = body.hits.hits.filter(function(esResult) {
      return true;//esResult._source.linkedIn['emailAddress'] !== currentUserEmail;
    }).map(function(esResult) {
      // Filter out the email address.
      delete esResult._source.linkedIn['emailAddress'];
      return esResult._source;
    });
    res.json({ success: sourceResults.length > 0, results: sourceResults });
  });
});

app.get('/get_users', function(req, res) {
  var req = req.params.

  es.search({
    index: 'users',
    size: 50,
    body: {

    }
  });
});

app.listen(config.PORT);

