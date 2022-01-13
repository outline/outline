declare module "socket.io-redis" {
  import { Redis } from "ioredis";

  type Config = {
    pubClient: Redis;
    subClient: Redis;
  };

  const socketRedisAdapter: (config: Config) => void;

  export = socketRedisAdapter;
}
