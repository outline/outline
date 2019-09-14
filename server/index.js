// @flow
import http from 'http';
import IO from 'socket.io';
import SocketAuth from 'socketio-auth';
import socketRedisAdapter from 'socket.io-redis';
import { getUserForJWT } from './utils/jwt';
import { Collection } from './models';
import app from './app';
import policy from './policies';

const server = http.createServer(app.callback());
let io;

if (process.env.WEBSOCKETS_ENABLED === 'true') {
  const { can } = policy;

  io = IO(server, {
    path: '/realtime',
    serveClient: false,
    cookie: false,
  });

  io.adapter(socketRedisAdapter(process.env.REDIS_URL));

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
      const { user } = socket.client;
      // join the rooms associated with the current team
      // and user so we can send authenticated events
      socket.join(`team-${user.teamId}`);
      socket.join(`user-${user.id}`);

      // join rooms associated with collections this user
      // has access to on connection. New collection subscriptions
      // are managed from the client as needed
      const collectionIds = await user.collectionIds();
      collectionIds.forEach(collectionId =>
        socket.join(`collection-${collectionId}`)
      );

      // allow the client to request to join rooms based on
      // new collections being created.
      socket.on('join', async event => {
        const collection = await Collection.findByPk(event.roomId);

        if (can(user, 'read', collection)) {
          socket.join(`collection-${event.roomId}`);
        }
      });

      socket.on('leave', event => {
        socket.leave(`collection-${event.roomId}`);
      });
    },
  });
}

server.on('error', err => {
  throw err;
});

server.on('listening', () => {
  const address = server.address();
  console.log(`\n> Listening on http://localhost:${address.port}\n`);
});

server.listen(process.env.PORT || '3000');

export const socketio = io;

export default server;
