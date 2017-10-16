// @flow
import { escape } from 'lodash';
import slug from 'slug';

export default function headingToSlug(heading: string, title: string) {
  const level = heading.replace('heading', 'h');
  return escape(`${level}-${slug(title)}`);
}
