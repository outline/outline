// @flow
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
    /**
     * On key down, check for our specific key shortcuts.
     */
    onKeyDown(ev: SyntheticEvent, data: Object, state: Object) {
      switch (data.key) {
        case '-':
          return this.onDash(ev, state);
        case '`':
          return this.onBacktick(ev, state);
        case 'tab':
          return this.onTab(ev, state);
        case 'space':
          return this.onSpace(ev, state);
        case 'backspace':
          return this.onBackspace(ev, state);
        case 'enter':
          return this.onEnter(ev, state);
        default:
          return null;
      }
    },

    /**
     * On space, if it was after an auto-markdown shortcut, convert the current
     * node into the shortcut's corresponding type.
     */
    onSpace(ev: SyntheticEvent, state: Object) {
      if (state.isExpanded) return;
      const { startBlock, startOffset } = state;
      const chars = startBlock.text.slice(0, startOffset).trim();
      const type = this.getType(chars);

      if (type) {
        if (type === 'list-item' && startBlock.type === 'list-item') return;
        ev.preventDefault();

        let checked;
        if (chars === '[x]') checked = true;
        if (chars === '[ ]') checked = false;
        const transform = state
          .transform()
          .setBlock({ type, data: { checked } });

        if (type === 'list-item') {
          if (checked !== undefined) {
            transform.wrapBlock('todo-list');
          } else if (chars === '1.') {
            transform.wrapBlock('ordered-list');
          } else {
            transform.wrapBlock('bulleted-list');
          }
        }

        state = transform.extendToStartOf(startBlock).delete().apply();
        return state;
      }

      for (const key of inlineShortcuts) {
        // find all inline characters
        let { mark, shortcut } = key;
        let inlineTags = [];

        // only add tags if they have spaces around them or the tag is beginning or the end of the block
        for (let i = 0; i < startBlock.text.length; i++) {
          const { text } = startBlock;
          const start = i;
          const end = i + shortcut.length;
          if (
            text.slice(start, end) === shortcut &&
            (start === 0 ||
              end === text.length ||
              [text.slice(start - 1, start), text.slice(end, end + 1)].includes(
                ' '
              ))
          )
            inlineTags.push(i);
        }

        // if we have multiple tags then mark the text between as inline code
        if (inlineTags.length > 1) {
          const transform = state.transform();
          const firstText = startBlock.getFirstText();
          const firstCodeTagIndex = inlineTags[0];
          const lastCodeTagIndex = inlineTags[inlineTags.length - 1];
          transform.removeTextByKey(
            firstText.key,
            lastCodeTagIndex,
            shortcut.length
          );
          transform.removeTextByKey(
            firstText.key,
            firstCodeTagIndex,
            shortcut.length
          );
          transform.moveOffsetsTo(
            firstCodeTagIndex,
            lastCodeTagIndex - shortcut.length
          );
          transform.addMark(mark);
          state = transform.collapseToEnd().removeMark(mark).apply();
          return state;
        }
      }
    },

    onDash(ev: SyntheticEvent, state: Object) {
      if (state.isExpanded) return;
      const { startBlock, startOffset } = state;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');

      if (chars === '--') {
        ev.preventDefault();
        return state
          .transform()
          .extendToStartOf(startBlock)
          .delete()
          .setBlock({
            type: 'horizontal-rule',
            isVoid: true,
          })
          .collapseToStartOfNextBlock()
          .insertBlock('paragraph')
          .apply();
      }
    },

    onBacktick(ev: SyntheticEvent, state: Object) {
      if (state.isExpanded) return;
      const { startBlock, startOffset } = state;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');

      if (chars === '``') {
        ev.preventDefault();
        return state
          .transform()
          .extendToStartOf(startBlock)
          .delete()
          .setBlock({
            type: 'code',
          })
          .apply();
      }
    },

    onBackspace(ev: SyntheticEvent, state: Object) {
      if (state.isExpanded) return;
      const { startBlock, selection, startOffset } = state;

      // If at the start of a non-paragraph, convert it back into a paragraph
      if (startOffset === 0) {
        if (startBlock.type === 'paragraph') return;
        ev.preventDefault();

        const transform = state.transform().setBlock('paragraph');

        if (startBlock.type === 'list-item')
          transform.unwrapBlock('bulleted-list');

        state = transform.apply();
        return state;
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

          const transform = state.transform();
          transform.removeMarkByKey(
            textNode.key,
            state.startOffset - charsInCodeBlock.size,
            state.startOffset,
            'code'
          );
          state = transform.apply();
          return state;
        }
      }
    },

    /**
     * On tab, if at the end of the heading jump to the main body content
     * as if it is another input field (act the same as enter).
     */
    onTab(ev: SyntheticEvent, state: Object) {
      if (state.startBlock.type === 'heading1') {
        ev.preventDefault();
        return state.transform().splitBlock().setBlock('paragraph').apply();
      }
    },

    /**
     * On return, if at the end of a node type that should not be extended,
     * create a new paragraph below it.
     */
    onEnter(ev: SyntheticEvent, state: Object) {
      if (state.isExpanded) return;
      const { startBlock, startOffset, endOffset } = state;
      if (startOffset === 0 && startBlock.length === 0)
        return this.onBackspace(ev, state);
      if (endOffset !== startBlock.length) return;

      // Hitting enter while an image is selected should jump caret below and
      // insert a new paragraph
      if (startBlock.type === 'image') {
        ev.preventDefault();
        return state
          .transform()
          .collapseToEnd()
          .insertBlock('paragraph')
          .apply();
      }

      // Hitting enter in a heading or blockquote will split the node at that
      // point and make the new node a paragraph
      if (
        startBlock.type !== 'heading1' &&
        startBlock.type !== 'heading2' &&
        startBlock.type !== 'heading3' &&
        startBlock.type !== 'heading4' &&
        startBlock.type !== 'heading5' &&
        startBlock.type !== 'heading6' &&
        startBlock.type !== 'block-quote'
      ) {
        return;
      }

      ev.preventDefault();
      return state.transform().splitBlock().setBlock('paragraph').apply();
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
