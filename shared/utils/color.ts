import md5 from "crypto-js/md5";
import { darken, parseToRgb } from "polished";
import theme from "../styles/theme";

export const palette = [
  theme.brand.red,
  theme.brand.blue,
  theme.brand.purple,
  theme.brand.pink,
  theme.brand.dusk,
  theme.brand.green,
  theme.brand.yellow,
  darken(0.2, theme.brand.red),
  darken(0.2, theme.brand.blue),
  darken(0.2, theme.brand.purple),
  darken(0.2, theme.brand.pink),
  darken(0.2, theme.brand.dusk),
  darken(0.2, theme.brand.green),
  darken(0.2, theme.brand.yellow),
];

export const validateColorHex = (color: string) =>
  /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);

export const stringToColor = (input: string) => {
  const inputAsNumber = parseInt(md5(input).toString(), 16);
  return palette[inputAsNumber % palette.length];
};

/**
 * Converts a color to string of RGB values separated by commas
 *
 * @param color - A color string
 * @returns A string of RGB values separated by commas
 */
export const toRGB = (color: string) =>
  Object.values(parseToRgb(color)).join(", ");

/**
 * Returns the text color that contrasts the given background color
 *
 * @param background - A color string
 * @returns A color string
 */
export const getTextColor = (background: string) => {
  const r = parseInt(background.substring(1, 3), 16);
  const g = parseInt(background.substring(3, 5), 16);
  const b = parseInt(background.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "black" : "white";
};
