// @flow
import { escape } from 'lodash';
import type { Node } from './types';
import slug from 'slug';

export default function headingToSlug(node: Node) {
  const level = node.type.replace('heading', 'h');
  return escape(`${level}-${slug(node.text)}-${node.key}`);
}
