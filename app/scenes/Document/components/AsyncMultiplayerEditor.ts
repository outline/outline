import * as React from "react";

const MultiplayerEditor = React.lazy(
  () =>
    import(
      /* webpackChunkName: "multiplayer-editor" */
      "./MultiplayerEditor"
    )
);

export default MultiplayerEditor;
