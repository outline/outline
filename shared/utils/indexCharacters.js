// @flow

export const validateIndexCharacters = (index: string) =>
  /^[\x21-\x7E]+$/i.test(index);
