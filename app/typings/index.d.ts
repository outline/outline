declare module "~/utils/autotrack";

declare module "vite/modulepreload-polyfill";

declare module "emoji-mart";

declare module "string-replace-to-array";

declare module "styled-components-breakpoint";

declare module "command-score";

declare module "*.png" {
  const value: any;
  export = value;
}

declare namespace JSX {
  interface IntrinsicElements {
    "zapier-app-directory": any;
    "em-emoji": any;
  }
}
