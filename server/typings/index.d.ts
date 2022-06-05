declare module "slate-md-serializer";

declare module "sequelize-encrypted";

declare module "styled-components-breakpoint";

declare module "formidable/lib/file";

declare module "socket.io-client";

declare module "oy-vey";

declare module "fetch-test-server";

declare module "@joplin/turndown-plugin-gfm" {
  import { Plugin } from "turndown";

  export const strikethrough: Plugin;
  export const tables: Plugin;
  export const taskListItems: Plugin;
  export const gfm: Plugin;
}
