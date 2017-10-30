// @flow
import emojiRegex from 'emoji-regex';

export default function parseTitle(text: string = '') {
  const regex = emojiRegex();

  // find and extract title
  const firstLine = text.trim().split(/\r?\n/)[0];
  const title = firstLine.replace(/^#/, '').trim();

  // find and extract first emoji
  const matches = regex.exec(title);
  const firstEmoji = matches ? matches[0] : null;
  const startsWithEmoji = firstEmoji && title.startsWith(firstEmoji);
  const emoji = startsWithEmoji ? firstEmoji : undefined;

  return { title, emoji };
}
