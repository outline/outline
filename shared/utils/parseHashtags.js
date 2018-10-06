// @flow
import hashtagRegex from 'hashtag-regex';

const regex = hashtagRegex();

export default function parseHashtags(text: string = '') {
  let matches = [];
  let match;

  while ((match = regex.exec(text))) { // eslint-disable-line
    matches.push(match[0]);
  }

  return matches;
}
