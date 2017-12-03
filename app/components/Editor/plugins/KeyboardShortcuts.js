// @flow
import type { change } from 'slate-prop-types';

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
    onKeyDown(ev: SyntheticEvent, data: Object, change: change) {
      if (!data.isMeta) return null;

      switch (data.key) {
        case 'b':
          return this.toggleMark(change, 'bold');
        case 'i':
          return this.toggleMark(change, 'italic');
        case 'u':
          return this.toggleMark(change, 'underlined');
        case 'd':
          return this.toggleMark(change, 'deleted');
        case 'k':
          return change.wrapInline({ type: 'link', data: { href: '' } });
        default:
          return null;
      }
    },

    toggleMark(change: change, type: string) {
      const { state } = change;
      // don't allow formatting of document title
      const firstNode = state.document.nodes.first();
      if (firstNode === state.startBlock) return;

      return state.change().toggleMark(type);
    },
  };
}
