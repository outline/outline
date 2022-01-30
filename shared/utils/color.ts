import crypto from "crypto";
import { darken } from "polished";
import theme from "../theme";

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

export const validateColorHex = (color: string) => {
  return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);
};

export const stringToColor = (input: string) => {
  const idAsHex = crypto.createHash("md5").update(input).digest("hex");
  const idAsNumber = parseInt(idAsHex, 16);
  return palette[idAsNumber % palette.length];
};
