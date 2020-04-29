// @flow
import slug from 'slug';

slug.defaults.mode = 'rfc3986';

export default function slugify(text: string): string {
  return slug(text, {
    remove: /[.]/g,
  });
}
