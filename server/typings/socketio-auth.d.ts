declare module "socketio-auth" {
  import IO from "socket.io";
  import { User } from "@server/models";

  type AuthenticatedSocket = IO.Socket & {
    client: IO.Socket["client"] & {
      user: User;
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
