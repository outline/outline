// @flow
import type { change } from 'slate-prop-types';
import EditList from './plugins/EditList';

const { transforms } = EditList;

type Options = {
  type: string | Object,
  wrapper?: string | Object,
  append?: string | Object,
};

export function splitAndInsertBlock(change: change, options: Options) {
  const { type, wrapper, append } = options;
  const { value } = change;
  const { document } = value;
  const parent = document.getParent(value.startBlock.key);

  // lists get some special treatment
  if (parent && parent.type === 'list-item') {
    change = transforms.unwrapList(
      transforms
        .splitListItem(change.collapseToStart())
        .collapseToEndOfPreviousBlock()
    );
  }

  change = change.insertBlock(type);

  if (wrapper) change = change.wrapBlock(wrapper);
  if (append) change = change.insertBlock(append);

  return change;
}
