declare module "slate-md-serializer";

declare module "sequelize-encrypted";

declare module "styled-components-breakpoint";

declare module "formidable/lib/file";

declare module "socket.io-client";

declare module "@tommoor/remove-markdown" {
  export default function removeMarkdown(
    text: string,
    options?: {
      stripHTML: boolean;
    }
  ): string;
}

declare module "socket.io-redis" {
  import { Redis } from "ioredis";

  type Config = {
    pubClient: Redis;
    subClient: Redis;
  };

  const socketRedisAdapter: (config: Config) => void;

  export = socketRedisAdapter;
}

declare module "oy-vey";
