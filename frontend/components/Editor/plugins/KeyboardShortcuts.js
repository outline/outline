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
    onKeyDown(e, data, state) {
      if (!data.isMeta) return null;
      e.preventDefault();

      switch (data.key) {
        case 'b':
          return this.toggleMark(state, 'bold');
        case 'i':
          return this.toggleMark(state, 'italic');
        case 'u':
          return this.toggleMark(state, 'underlined');
        case 'd':
          return this.toggleMark(state, 'strikethrough');
        default:
          return null;
      }
    },

    toggleMark(state, type) {
      state = state.transform().toggleMark(type).apply();
      return state;
    },
  };
}
