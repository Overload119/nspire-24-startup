var express = require('express');
var config  = require('./config.js');
var app     = express();

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.send('hello world');
});

app.listen(config.PORT);

