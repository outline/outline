// @flow
import IO from 'socket.io';
import SocketAuth from 'socketio-auth';
import { getUserForJWT } from './utils/jwt';
import http from 'http';
import app from './app';

const server = http.createServer(app.callback());
const io = IO(server, {
  path: '/realtime',
  serveClient: false,
  cookie: false,
});

SocketAuth(io, {
  authenticate: async (socket, data, callback) => {
    const { token } = data;

    try {
      const user = await getUserForJWT(token);
      socket.client.user = user;

      return callback(null, true);
    } catch (err) {
      return callback(err);
    }
  },
  postAuthenticate: async (socket, data) => {
    // join the rooms associated with the current team
    // and user so we can send authenticated events
    socket.join(socket.client.user.teamId);
    socket.join(socket.client.user.id);

    // join rooms associated with collections this user
    // has access to on connection. New collection subscriptions
    // are managed from the client as needed
    const collectionIds = await socket.client.user.collectionIds();
    collectionIds.forEach(collectionId => socket.join(collectionId));
  },
});

server.on('error', err => {
  throw err;
});

server.on('listening', () => {
  const address = server.address();
  console.log(`\n> Listening on http://localhost:${address.port}\n`);
});

io.on('connection', socket => {
  console.log('a user connected');
  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});

export const socketio = io;

server.listen(process.env.PORT || '3000');

export default server;
