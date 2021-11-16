declare module "autotrack/autotrack.js";

declare module "boundless-arrow-key-navigation";

declare module "outline-icons";

declare module "string-replace-to-array";

declare module "styled-components-breakpoint";

declare module "socketio-auth";

declare module "emoji-regex" {
  const RegExpFactory: () => RegExp;
  export = RegExpFactory;
}

declare module "fetch-with-proxy" {
  export = fetch;
}

declare module "koa-onerror";

declare module "*.png" {
  const value: any;
  export = value;
}
