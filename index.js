require('./init');
var app = require('./server').default;
var http = require('http');

var server = http.createServer(app.callback());
server.listen(process.env.PORT || '3000');
server.on('error', (err) => {
  throw err;
});
server.on('listening', () => {
  var address = server.address();
  console.log('Listening on %s%s', address.address, address.port);
});