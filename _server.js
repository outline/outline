var path = require('path');
var express = require('express');

var app = express();
var port = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  var webpack = require('webpack');
  var config = require('./webpack.config.dev');
  var compiler = webpack(config);

  app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath
  }));
  app.use(require('webpack-hot-middleware')(compiler));
} else {
  app.use('/static', express.static('dist'));
}

// Frontend
app.get('/service-worker.js', function(req, res) {
  res.header("Content-Type", "application/javascript");
  res.sendFile(path.join(__dirname, 'service-worker.js'));
});
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, function(err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Listening at ' + port);
});
