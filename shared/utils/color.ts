import md5 from "crypto-js/md5";
import { darken, parseToRgb } from "polished";
import theme from "../styles/theme";
import type { RgbaColor } from "polished/lib/types/color";

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

const round = (
  number: number,
  digits = 0,
  base = Math.pow(10, digits)
): number => Math.round(base * number) / base;

const toHex = (number: number) => {
  const hex = number.toString(16);
  return hex.length < 2 ? "0" + hex : hex;
};

export const rgbaToHex = ({ red, green, blue, alpha }: RgbaColor): string => {
  const alphaHex = alpha < 1 ? toHex(round(alpha * 255)) : "";
  return "#" + toHex(red) + toHex(green) + toHex(blue) + alphaHex;
};

interface PresetColor {
  hex: string;
  name: string;
}

export const presetColors: PresetColor[] = [
  { hex: "#FDEA9B", name: "Coral" },
  { hex: "#FED46A", name: "Apricot" },
  { hex: "#FA551E", name: "Sunset" },
  { hex: "#B4DC19", name: "Smoothie" },
  { hex: "#C8AFF0", name: "Bubblegum" },
  { hex: "#3CBEFC", name: "Neon" },
];

export const hexToRgba = (hex: string): RgbaColor => {
  if (hex[0] === "#") {
    hex = hex.substring(1);
  }

  if (hex.length < 6) {
    return {
      red: parseInt(hex[0] + hex[0], 16),
      green: parseInt(hex[1] + hex[1], 16),
      blue: parseInt(hex[2] + hex[2], 16),
      alpha:
        hex.length === 4 ? round(parseInt(hex[3] + hex[3], 16) / 255, 2) : 1,
    };
  }

  return {
    red: parseInt(hex.substring(0, 2), 16),
    green: parseInt(hex.substring(2, 4), 16),
    blue: parseInt(hex.substring(4, 6), 16),
    alpha:
      hex.length === 8 ? round(parseInt(hex.substring(6, 8), 16) / 255, 2) : 1,
  };
};
