const inlineShortcuts = [
  { mark: 'bold', shortcut: '**' },
  { mark: 'italic', shortcut: '*' },
  { mark: 'italic', shortcut: '_' },
  { mark: 'code', shortcut: '`' },
  { mark: 'added', shortcut: '__' },
  { mark: 'added', shortcut: '++' },
  { mark: 'deleted', shortcut: '~~' },
];

export default function MarkdownShortcuts() {
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
      switch (data.key) {
        case '-':
          return this.onDash(e, state);
        case 'space':
          return this.onSpace(e, state);
        case 'backspace':
          return this.onBackspace(e, state);
        case 'enter':
          return this.onEnter(e, state);
        default:
          return null;
      }
    },

    /**
     * On space, if it was after an auto-markdown shortcut, convert the current
     * node into the shortcut's corresponding type.
     *
     * @param {Event} e
     * @param {State} state
     * @return {State or Null} state
     */
    onSpace(e, state) {
      if (state.isExpanded) return;
      const { startBlock, startOffset } = state;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');
      const type = this.getType(chars);

      if (type) {
        if (type === 'list-item' && startBlock.type === 'list-item') return;
        e.preventDefault();

        const transform = state.transform().setBlock(type);

        if (type === 'list-item') {
          if (chars === '1.') {
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

        for (let i = 0; i < startBlock.text.length; i++) {
          if (startBlock.text.slice(i, i + shortcut.length) === shortcut)
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

    /**
     * @param {Event} e
     * @param {State} state
     * @return {State or Null} state
     */
    onDash(e, state) {
      if (state.isExpanded) return;
      const { startBlock, startOffset } = state;
      const chars = startBlock.text.slice(0, startOffset).replace(/\s*/g, '');

      if (chars === '--') {
        e.preventDefault();
        const transform = state
          .transform()
          .extendToStartOf(startBlock)
          .delete()
          .setBlock({
            type: 'horizontal-rule',
            isVoid: true,
          });
        state = transform
          .collapseToStartOfNextBlock()
          .insertBlock('paragraph')
          .apply();
        return state;
      }
    },

    /**
     * @param {Event} e
     * @param {State} state
     * @return {State or Null} state
     */
    onBackspace(e, state) {
      if (state.isExpanded) return;
      const { startBlock, selection, startOffset } = state;

      // If at the start of a non-paragraph, convert it back into a paragraph
      if (startOffset === 0) {
        if (startBlock.type === 'paragraph') return;
        e.preventDefault();

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
          e.preventDefault();

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
     * On return, if at the end of a node type that should not be extended,
     * create a new paragraph below it.
     *
     * @param {Event} e
     * @param {State} state
     * @return {State or Null} state
     */
    onEnter(ev, state) {
      if (state.isExpanded) return;
      const { startBlock, startOffset, endOffset } = state;
      if (startOffset === 0 && startBlock.length === 0)
        return this.onBackspace(ev, state);
      if (endOffset !== startBlock.length) return;

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
     *
     * @param {String} chars
     * @return {String} block
     */
    getType(chars) {
      switch (chars) {
        case '*':
        case '-':
        case '+':
        case '1.':
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
