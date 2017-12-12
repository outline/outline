// @flow
import { Change } from 'slate';

export default function KeyboardShortcuts() {
  return {
    onKeyDown(ev: SyntheticKeyboardEvent, change: Change) {
      if (!ev.metaKey) return null;

      switch (ev.key) {
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

    toggleMark(change: Change, type: string) {
      const { value } = change;
      // don't allow formatting of document title
      const firstNode = value.document.nodes.first();
      if (firstNode === value.startBlock) return;

      change.toggleMark(type);
    },
  };
}
