declare module "autotrack/autotrack.js";

declare module "boundless-arrow-key-navigation";

declare module "outline-icons";

declare module "string-replace-to-array";

declare module "styled-components-breakpoint";

declare module "socketio-auth";

declare module "oy-vey";

declare module "emoji-regex" {
  const RegExpFactory: () => RegExp;
  export = RegExpFactory;
}

declare module "*.png" {
  const value: any;
  export = value;
}
