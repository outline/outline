// @flow
import { filter } from 'lodash';
import slugify from 'shared/utils/slugify';
import unescape from 'shared/utils/unescape';

export default function getHeadingsForText(
  text: string
): { level: number, title: string, slug: string }[] {
  const regex = /^(#{1,6})\s(.*)$/gm;

  let match;
  let output = [];
  while ((match = regex.exec(text)) !== null) {
    if (!match) continue;

    const level = match[1].length;
    const title = unescape(match[2]);

    let slug = slugify(title);
    const existing = filter(output, { slug });
    if (existing.length) {
      slug = `${slug}-${existing.length}`;
    }
    output.push({ level, title, slug });
  }

  return output;
}
