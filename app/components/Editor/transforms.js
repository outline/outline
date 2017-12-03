// @flow
import { Change } from 'slate';
import EditList from './plugins/EditList';

const { changes } = EditList;

type Options = {
  type: string | Object,
  wrapper?: string | Object,
  append?: string | Object,
};

export function splitAndInsertBlock(change: Change, options: Options) {
  const { type, wrapper, append } = options;
  const { value } = change;
  const { document } = value;
  const parent = document.getParent(value.startBlock.key);

  // lists get some special treatment
  if (parent && parent.type === 'list-item') {
    change = changes.unwrapList(
      changes
        .splitListItem(change.collapseToStart())
        .collapseToEndOfPreviousBlock()
    );
  }

  change = change.insertBlock(type);

  if (wrapper) change = change.wrapBlock(wrapper);
  if (append) change = change.insertBlock(append);

  return change;
}
