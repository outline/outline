// @flow
import { darken } from "polished";
import theme from "../../shared/theme";

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
