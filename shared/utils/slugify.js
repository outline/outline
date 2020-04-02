// @flow
import slugify from 'slugify';

// Slugify, escape, and remove periods from headings so that they are
// compatible with url hashes AND dom selectors
export default function safeSlugify(text: string) {
  return `h-${escape(slugify(text, { lower: true }).replace('.', '-'))}`;
}
