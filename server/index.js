// @flow
import http from 'http';
import IO from 'socket.io';
import SocketAuth from 'socketio-auth';
import socketRedisAdapter from 'socket.io-redis';
import { getUserForJWT } from './utils/jwt';
import { Document, Collection } from './models';
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

      // allow the client to request to join rooms dynamically
      socket.on('join', async event => {
        if (event.collectionId) {
          const collection = await Collection.scope({
            method: ['withMembership', user.id],
          }).findByPk(event.collectionId);

          if (can(user, 'read', collection)) {
            socket.join(`collection-${event.collectionId}`);
          }
        }

        if (event.documentId) {
          const document = await Document.findByPk(event.documentId, {
            userId: user.id,
          });

          if (can(user, 'read', document)) {
            socket.join(`document-${event.documentId}`);
          }
        }
      });

      socket.on('leave', event => {
        if (event.collectionId) {
          socket.leave(`collection-${event.collectionId}`);
        }
        if (event.documentId) {
          socket.leave(`document-${event.documentId}`);
        }
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
