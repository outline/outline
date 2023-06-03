import lazyWithRetry from "~/utils/lazyWithRetry";

const MultiplayerEditor = lazyWithRetry(() => import("./MultiplayerEditor"));

export default MultiplayerEditor;
