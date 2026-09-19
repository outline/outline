import md5 from "crypto-js/md5";
import { darken, parseToHsl, parseToRgb } from "polished";
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
  /^#(?:[0-9A-F]{3,4}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(color);

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

/**
 * Converts a CSS color in any notation into hex notation.
 *
 * @param color - a color string in any notation understood by polished.
 * @returns the color in hex notation, or null if it is not a color that can be
 * parsed, or is fully transparent.
 */
export const toHexColor = (color: string): string | null => {
  try {
    const rgb = parseToRgb(color);
    const alpha = "alpha" in rgb ? rgb.alpha : 1;
    if (alpha === 0) {
      return null;
    }
    return rgbaToHex({ ...rgb, alpha });
  } catch {
    return null;
  }
};

/**
 * Whether a color is close enough to white that it is likely a page or default
 * background rather than deliberate styling.
 *
 * @param color - a color string in any notation understood by polished.
 * @returns true if the color is near white.
 */
export const isNearWhite = (color: string): boolean => {
  try {
    const { red, green, blue } = parseToRgb(color);
    return red > 250 && green > 250 && blue > 250;
  } catch {
    return false;
  }
};

export interface ColorFormats {
  /** The color in uppercase hex notation, with an alpha pair when translucent. */
  hex: string;
  /** The color in `rgb()` notation, or `rgba()` when translucent. */
  rgb: string;
  /** The color in `hsl()` notation, or `hsla()` when translucent. */
  hsl: string;
}

/**
 * Translates a CSS color into the equivalent hex, rgb, and hsl notations. The
 * notation the color was given in is returned unchanged, so that no precision
 * is lost to a round trip through another color space.
 *
 * @param color - a color string in any notation understood by polished.
 * @returns the same color expressed in each notation.
 * @throws if the string is not a valid CSS color.
 */
export const toColorFormats = (color: string): ColorFormats => {
  const rgb = parseToRgb(color);
  const hsl = parseToHsl(color);
  const alpha = "alpha" in rgb && rgb.alpha !== undefined ? rgb.alpha : 1;

  const hue = round(hsl.hue);
  const saturation = round(hsl.saturation * 100);
  const lightness = round(hsl.lightness * 100);
  const opacity = round(alpha, 2);

  const formats: ColorFormats = {
    hex: rgbaToHex({ ...rgb, alpha }).toUpperCase(),
    rgb:
      alpha < 1
        ? `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${opacity})`
        : `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`,
    hsl:
      alpha < 1
        ? `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`
        : `hsl(${hue}, ${saturation}%, ${lightness}%)`,
  };

  if (validateColorHex(color)) {
    formats.hex = color.toUpperCase();
  } else if (/^rgba?\(/i.test(color)) {
    formats.rgb = color;
  } else if (/^hsla?\(/i.test(color)) {
    formats.hsl = color;
  }

  return formats;
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
