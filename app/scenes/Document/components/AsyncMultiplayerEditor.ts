import lazyWithRetry from "@shared/utils/lazyWithRetry";

const MultiplayerEditor = lazyWithRetry(() => import("./MultiplayerEditor"));

export default MultiplayerEditor;
