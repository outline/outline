// @flow
import { Change } from 'slate';

const inlineShortcuts = [
  { mark: 'bold', shortcut: '**' },
  { mark: 'bold', shortcut: '__' },
  { mark: 'italic', shortcut: '*' },
  { mark: 'italic', shortcut: '_' },
  { mark: 'code', shortcut: '`' },
  { mark: 'added', shortcut: '++' },
  { mark: 'deleted', shortcut: '~~' },
];

export default function MarkdownShortcuts() {
  return {
    onKeyDown(ev: SyntheticKeyboardEvent, change: Change) {
      switch (ev.key) {
        case '-':
          return this.onDash(ev, change);
        case '`':
          return this.onBacktick(ev, change);
        case 'Tab':
          return this.onTab(ev, change);
        case ' ':
          return this.onSpace(ev, change);
        case 'Backspace':
          return this.onBackspace(ev, change);
        case 'Enter':
          return this.onEnter(ev, change);
        default:
          return null;
      }
    },

    /**
     * On space, if it was after an auto-markdown shortcut, convert the current
     * node into the shortcut's corresponding type.
     */
    onSpace(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;
      if (value.isExpanded) return;
      const { startBlock, startOffset } = value;

      // no markdown shortcuts work in headings
      if (startBlock.type.match(/heading/)) return;

      const chars = startBlock.text.slice(0, startOffset).trim();
      const type = this.getType(chars);

      if (type) {
        if (type === 'list-item' && startBlock.type === 'list-item') return;
        ev.preventDefault();

        let checked;
        if (chars === '[x]') checked = true;
        if (chars === '[ ]') checked = false;

        change
          .extendToStartOf(startBlock)
          .delete()
          .setBlock(
            {
              type,
              data: { checked },
            },
            { normalize: false }
          );

        if (type === 'list-item') {
          if (checked !== undefined) {
            change.wrapBlock('todo-list');
          } else if (chars === '1.') {
            change.wrapBlock('ordered-list');
          } else {
            change.wrapBlock('bulleted-list');
          }
        }

        return true;
      }

      for (const key of inlineShortcuts) {
        // find all inline characters
        let { mark, shortcut } = key;
        let inlineTags = [];

        // only add tags if they have spaces around them or the tag is beginning
        // or the end of the block
        for (let i = 0; i < startBlock.text.length; i++) {
          const { text } = startBlock;
          const start = i;
          const end = i + shortcut.length;
          const beginningOfBlock = start === 0;
          const endOfBlock = end === text.length;
          const surroundedByWhitespaces = [
            text.slice(start - 1, start),
            text.slice(end, end + 1),
          ].includes(' ');

          if (
            text.slice(start, end) === shortcut &&
            (beginningOfBlock || endOfBlock || surroundedByWhitespaces)
          ) {
            inlineTags.push(i);
          }
        }

        // if we have multiple tags then mark the text between as inline code
        if (inlineTags.length > 1) {
          const firstText = startBlock.getFirstText();
          const firstCodeTagIndex = inlineTags[0];
          const lastCodeTagIndex = inlineTags[inlineTags.length - 1];
          return change
            .removeTextByKey(firstText.key, lastCodeTagIndex, shortcut.length)
            .removeTextByKey(firstText.key, firstCodeTagIndex, shortcut.length)
            .moveOffsetsTo(
              firstCodeTagIndex,
              lastCodeTagIndex - shortcut.length
            )
            .addMark(mark)
            .collapseToEnd()
            .removeMark(mark);
        }
      }
    },

    onDash(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;
      if (value.isExpanded) return;
      const { startBlock, startOffset } = value;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');

      if (chars === '--') {
        ev.preventDefault();
        return change
          .extendToStartOf(startBlock)
          .delete()
          .setBlock(
            {
              type: 'horizontal-rule',
              isVoid: true,
            },
            { normalize: false }
          )
          .insertBlock('paragraph')
          .collapseToStart();
      }
    },

    onBacktick(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;
      if (value.isExpanded) return;
      const { startBlock, startOffset } = value;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');

      if (chars === '``') {
        ev.preventDefault();
        return change
          .extendToStartOf(startBlock)
          .delete()
          .setBlock({ type: 'code' });
      }
    },

    onBackspace(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;
      if (value.isExpanded) return;
      const { startBlock, selection, startOffset } = value;

      // If at the start of a non-paragraph, convert it back into a paragraph
      if (startOffset === 0) {
        if (startBlock.type === 'paragraph') return;
        ev.preventDefault();

        change.setBlock('paragraph');

        if (startBlock.type === 'list-item') {
          change.unwrapBlock('bulleted-list');
        }

        return change;
      }

      // If at the end of a code mark hitting backspace should remove the mark
      if (selection.isCollapsed) {
        const marksAtCursor = startBlock.getMarksAtRange(selection);
        const codeMarksAtCursor = marksAtCursor.filter(
          mark => mark.type === 'code'
        );

        if (codeMarksAtCursor.size > 0) {
          ev.preventDefault();

          const textNode = startBlock.getTextAtOffset(startOffset);
          const charsInCodeBlock = textNode.characters
            .takeUntil((v, k) => k === startOffset)
            .reverse()
            .takeUntil((v, k) => !v.marks.some(mark => mark.type === 'code'));

          change.removeMarkByKey(
            textNode.key,
            startOffset - charsInCodeBlock.size,
            startOffset,
            'code'
          );
        }
      }
    },

    /**
     * On tab, if at the end of the heading jump to the main body content
     * as if it is another input field (act the same as enter).
     */
    onTab(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;

      if (value.startBlock.type === 'heading1') {
        ev.preventDefault();
        change.splitBlock().setBlock('paragraph');
      }
    },

    /**
     * On return, if at the end of a node type that should not be extended,
     * create a new paragraph below it.
     */
    onEnter(ev: SyntheticKeyboardEvent, change: Change) {
      const { value } = change;
      if (value.isExpanded) return;

      const { startBlock, startOffset, endOffset } = value;
      if (startOffset === 0 && startBlock.length === 0)
        return this.onBackspace(ev, change);

      // Hitting enter at the end of the line reverts to standard behavior
      if (endOffset === startBlock.length) return;

      // Hitting enter while an image is selected should jump caret below and
      // insert a new paragraph
      if (startBlock.type === 'image') {
        ev.preventDefault();
        return change.collapseToEnd().insertBlock('paragraph');
      }

      // Hitting enter in a heading or blockquote will split the node at that
      // point and make the new node a paragraph
      if (
        startBlock.type.startsWith('heading') ||
        startBlock.type === 'block-quote'
      ) {
        ev.preventDefault();
        return change.splitBlock().setBlock('paragraph');
      }
    },

    /**
     * Get the block type for a series of auto-markdown shortcut `chars`.
     */
    getType(chars: string) {
      switch (chars) {
        case '*':
        case '-':
        case '+':
        case '1.':
        case '[ ]':
        case '[x]':
          return 'list-item';
        case '>':
          return 'block-quote';
        case '#':
          return 'heading1';
        case '##':
          return 'heading2';
        case '###':
          return 'heading3';
        case '####':
          return 'heading4';
        case '#####':
          return 'heading5';
        case '######':
          return 'heading6';
        default:
          return null;
      }
    },
  };
}
