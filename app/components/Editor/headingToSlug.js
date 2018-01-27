// @flow
import { escape } from 'lodash';
import { Node } from 'slate';
import slug from 'slug';

export default function headingToSlug(node: Node, index: number = 0) {
  const slugified = escape(slug(node.text));
  if (index === 0) return slugified;
  return `${index}-${slugified}`;
}
