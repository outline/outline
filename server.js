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

// API stubs - Feel free to tear these down in favor of rolling out proper APIs
// Also `body-parser` module is included only for this
var router = express.Router();

var validJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
function isAuthenticated(req, res, next) {
  // Authenticate with JWT
  if (req.headers.authorization) {
    var tokenParts = req.headers.authorization.split(" ");
    if (tokenParts.length === 2 &&
        tokenParts[0].trim().toUpperCase() === "JWT" &&
        tokenParts[1].trim() === validJwtToken
      ) {
      return next();
    }
  }

  // Return 401 with invalid credentials
  res.status(401).json({
    'error': 'Invalid JWT token'
  });
}

router.post('/authenticate', function(req, res) {
  if (req.body.email === 'user1@example.com' &&
      req.body.password === 'test123!') {
    res.json({
      'jwt_token': validJwtToken,
    });
  } else {
    res.status(400).json({
      'error': 'Invalid credentials'
    });
  }
});

router.get('/user', isAuthenticated, function(req, res) {
  res.json({
    id: '93c3a6d6-3958-44c9-a668-59711befb25c',
    email: 'user1@example.com',
    name: 'Test User'
  });
});


// Register API
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use('/api', router);

// Frontend
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
