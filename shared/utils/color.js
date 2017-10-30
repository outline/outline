// @flow

export const validateColorHex = (color: string) =>
  /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);
