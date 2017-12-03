// @flow
import { escape } from 'lodash';
import type { node } from 'slate-prop-types';
import slug from 'slug';

export default function headingToSlug(node: node) {
  const level = node.type.replace('heading', 'h');
  return escape(`${level}-${slug(node.text)}-${node.key}`);
}
