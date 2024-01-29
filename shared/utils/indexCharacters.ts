export const validateIndexCharacters = (index: string) =>
  new RegExp("^[\x20-\x7E]+$").test(index);
