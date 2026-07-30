import { setLightness } from "polished";
import type { DefaultTheme } from "styled-components";
import styled, { css } from "styled-components";
import { validateColorHex } from "../utils/color";

/**
 * The look of a select option chip: a soft tint of the option's own color,
 * with the label in a stronger shade of it. Shared so that every view renders
 * an option identically, and so a chip stays legible in both themes whichever
 * color was chosen — filling the chip with the raw color would leave the
 * saturated end of the palette shouting over the rest of the page.
 */
export const propertyChipStyles = css<{ $color?: string }>`
  display: inline-block;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 13px;
  white-space: nowrap;
  background: ${(props) => chipBackground(props.$color, props.theme)};
  color: ${(props) => chipForeground(props.$color, props.theme)};
`;

/** A select or multi-select option rendered as a colored chip. */
export const PropertyChip = styled.span<{ $color?: string }>`
  ${propertyChipStyles}
`;

// the option color is kept only for its hue — both the fill and the label are
// pinned to a fixed lightness so that every option in the palette produces an
// equally soft chip, whether the color chosen was pale yellow or near-black.
// The label values are the ones that clear a 4.5:1 contrast ratio against the
// fill for every color in the palette, the yellows and greens being the tight
// ones
const FILL_LIGHTNESS = { light: 0.92, dark: 0.22 };
const LABEL_LIGHTNESS = { light: 0.25, dark: 0.78 };

/** The chip's fill: a pale wash of the option color, or a neutral surface. */
function chipBackground(color: string | undefined, theme: DefaultTheme) {
  if (!color || !validateColorHex(color)) {
    return theme.backgroundSecondary;
  }
  return setLightness(
    theme.isDark ? FILL_LIGHTNESS.dark : FILL_LIGHTNESS.light,
    color
  );
}

/** The chip's label: the same hue, dark enough to read on the fill. */
function chipForeground(color: string | undefined, theme: DefaultTheme) {
  if (!color || !validateColorHex(color)) {
    return theme.text;
  }
  return setLightness(
    theme.isDark ? LABEL_LIGHTNESS.dark : LABEL_LIGHTNESS.light,
    color
  );
}
