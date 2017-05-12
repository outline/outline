// @flow
import emojiMapping from './emoji-mapping.json';

const EMOJI_REGEX = /:([A-Za-z0-9_\-+]+?):/gm;

const emojify = (text: string = '') => {
  let emojifiedText = text;

  emojifiedText = text.replace(EMOJI_REGEX, (match, p1, offset, string) => {
    return emojiMapping[p1] || match;
  });

  return emojifiedText;
};

export default emojify;
