import "react";

// React 19 resolves intrinsic elements from React.JSX rather than the global
// JSX namespace, so custom elements must be declared here.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "zapier-app-directory": any;
      "em-emoji": any;
    }
  }
}
