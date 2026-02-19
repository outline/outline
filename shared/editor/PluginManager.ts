import { type DecorationSet } from "prosemirror-view";

// key, val pair
// key is plugin Key
// val is initial plugin state
// Types:
// 1. PluginKey: union type of all plugin keys
// 2. InitialPluginState<PluginKey>
// 3. InitialPluginStates<PluginKey, InitialPluginState<PluginKey>>
// 4. setInitialPluginState<PluginKey>(key: PluginKey, state: InitialPluginState<PluginKey>): void
// 5. getInitialPluginState<PluginKey>(key: PluginKey): InitialPluginState<PluginKey>

/** Map of plugin keys to their state shapes. */
export interface PluginStateMap {
  toggleFold: { foldedIds: Set<string>; decorations: DecorationSet };
}

/** Union of all plugin keys. */
export type EditorPluginKey = keyof PluginStateMap;

/** Lookup type: given a key, returns its plugin state shape. */
export type InitialPluginState<K extends EditorPluginKey> = PluginStateMap[K];

/** Full map of all initial plugin states. */
export type InitialPluginStates = {
  [K in EditorPluginKey]: InitialPluginState<K>;
};

class PluginManager {
  private initialPluginStates = new Map<
    EditorPluginKey,
    InitialPluginState<EditorPluginKey>
  >();

  setInitialPluginState<K extends EditorPluginKey>(
    key: K,
    state: InitialPluginState<K>
  ) {
    this.initialPluginStates.set(key, state);
  }

  getInitialPluginState<K extends EditorPluginKey>(
    key: K
  ): InitialPluginState<K> | undefined {
    return this.initialPluginStates.get(key);
  }
}

export const pluginManager = new PluginManager();
