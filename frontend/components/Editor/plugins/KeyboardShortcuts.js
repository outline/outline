// @flow

export default function KeyboardShortcuts() {
  return {
    /**
     * On key down, check for our specific key shortcuts.
     *
     * @param {Event} e
     * @param {Data} data
     * @param {State} state
     * @return {State or Null} state
     */
    onKeyDown(ev: SyntheticEvent, data: Object, state: Object) {
      if (!data.isMeta) return null;

      switch (data.key) {
        case 'b':
          return this.toggleMark(state, 'bold');
        case 'i':
          return this.toggleMark(state, 'italic');
        case 'u':
          return this.toggleMark(state, 'underlined');
        case 'd':
          return this.toggleMark(state, 'deleted');
        default:
          return null;
      }
    },

    toggleMark(state: Object, type: string) {
      // don't allow formatting of document title
      const firstNode = state.document.nodes.first();
      if (firstNode === state.startBlock) return;

      state = state.transform().toggleMark(type).apply();
      return state;
    },
  };
}
