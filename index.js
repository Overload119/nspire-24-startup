var express       = require('express');
var elasticsearch = require('elasticsearch');
var config        = require('./config.js');
var app           = express();
var es            = new elasticsearch.Client({
                      host: 'localhost:9200',
                      log: 'trace'
                    });

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.send('hello world');
});

app.listen(config.PORT);

