// @flow
import EditList from './plugins/EditList';
import type { State } from './types';

const { transforms } = EditList;

type Options = {
  type: string | Object,
  wrapper?: string | Object,
  append?: string | Object,
};

export function splitAndInsertBlock(state: State, options: Options) {
  const { type, wrapper, append } = options;
  let transform = state.transform();
  const { document } = state;
  const parent = document.getParent(state.startBlock.key);

  // lists get some special treatment
  if (parent && parent.type === 'list-item') {
    transform = transforms.unwrapList(
      transforms
        .splitListItem(transform.collapseToStart())
        .collapseToEndOfPreviousBlock()
    );
  }

  transform = transform.insertBlock(type);

  if (wrapper) transform = transform.wrapBlock(wrapper);
  if (append) transform = transform.insertBlock(append);

  return transform;
}
