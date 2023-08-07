import md5 from "crypto-js/md5";
import { darken } from "polished";
import theme from "../styles/theme";

export const palette = [
  theme.brand.red,
  theme.brand.blue,
  theme.brand.purple,
  theme.brand.pink,
  theme.brand.marine,
  theme.brand.green,
  theme.brand.yellow,
  darken(0.2, theme.brand.red),
  darken(0.2, theme.brand.blue),
  darken(0.2, theme.brand.purple),
  darken(0.2, theme.brand.pink),
  darken(0.2, theme.brand.marine),
  darken(0.2, theme.brand.green),
  darken(0.2, theme.brand.yellow),
];

export const validateColorHex = (color: string) =>
  /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);

export const stringToColor = (input: string) => {
  const inputAsNumber = parseInt(md5(input).toString(), 16);
  return palette[inputAsNumber % palette.length];
};

export const hexToRgb = (hex: string) => {
  if (!validateColorHex(hex)) {
    throw Error("Invalid hex color!");
  }
  const isThreeDigitHex = /^#[0-9a-f]{3}$/i.test(hex);
  const color = isThreeDigitHex ? `#${hex.slice(1).repeat(2)}` : hex;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  return result!
    .slice(1)
    .map((c) => parseInt(c, 16))
    .join(", ");
};
