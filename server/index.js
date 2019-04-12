// @flow
import IO from 'socket.io';
import http from 'http';
import app from './app';

const server = http.createServer(app.callback());
const io = IO(server, {
  path: '/realtime',
  serveClient: false,
  cookie: false,
});

server.on('error', err => {
  throw err;
});

server.on('listening', () => {
  const address = server.address();
  console.log(`\n> Listening on http://localhost:${address.port}\n`);
});

io.on('connection', function(socket) {
  console.log('a user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

export const socketio = io;

server.listen(process.env.PORT || '3000');

export default server;
