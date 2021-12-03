declare module "autotrack/autotrack.js";

declare module "boundless-arrow-key-navigation";

declare module "string-replace-to-array";

declare module "styled-components-breakpoint";

declare module "formidable/lib/file";

declare module "socket.io-redis" {
  import { Redis } from "ioredis";

  type Config = {
    pubClient: Redis;
    subClient: Redis;
  };

  const socketRedisAdapter: (config: Config) => void;

  export = socketRedisAdapter;
}

declare module "socketio-auth" {
  import IO from "socket.io";

  type AuthenticatedSocket = IO.Socket & {
    client: IO.Client & {
      user: any;
    };
  };

  type AuthenticateCallback = (
    socket: AuthenticatedSocket,
    data: { token: string },
    callback: (err: Error | null, allow: boolean) => void
  ) => Promise<void>;

  type PostAuthenticateCallback = (
    socket: AuthenticatedSocket
  ) => Promise<void>;

  type AuthenticationConfig = {
    authenticate: AuthenticateCallback;
    postAuthenticate: PostAuthenticateCallback;
  };

  const SocketAuth: (io: IO.Server, config: AuthenticationConfig) => void;

  export = SocketAuth;
}

declare module "oy-vey";

declare module "emoji-regex" {
  const RegExpFactory: () => RegExp;
  export = RegExpFactory;
}

declare module "*.png" {
  const value: any;
  export = value;
}
