require('./init');
const app = require('./server').default;
const http = require('http');

const server = http.createServer(app.callback());
server.listen(process.env.PORT || '3000');
server.on('error', err => {
  throw err;
});
server.on('listening', () => {
  const address = server.address();
  console.log(`Listening on http://localhost:${address.port}`);
});
