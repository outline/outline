import styled, { css } from "styled-components";
import { s } from "@shared/styles";
/**
 * Themed surfaces for the pet store scenes.
 *
 * The ported Tailwind UI kit is light-only – it paints `bg-white` and
 * `text-gray-900` directly – so anything built from it disappears when the
 * app is in dark mode. These primitives take their colours from Outline's
 * theme instead, which is the only thing that follows the user's choice.
 * Layout classes from Tailwind are colour-neutral and can still be used
 * alongside them.
 */
/** A raised panel, the equivalent of `bg-white shadow ring-1 ring-gray-200`. */
export const Card = styled.div`
  overflow: hidden;
  border-radius: 8px;
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
`;
/** A full-width table with the shop's row rhythm. */
export const Table = styled.table`
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  color: ${s("text")};
`;
/** The header band above a table. */
export const THead = styled.thead`
  background: ${s("backgroundTertiary")};
`;
/** The body of a table, with a hairline between rows. */
export const TBody = styled.tbody`
  & > tr + tr {
    border-top: 1px solid ${s("divider")};
  }
`;
/** A column heading. */
export const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: ${s("textSecondary")};
  white-space: nowrap;
`;
/** A cell. */
export const Td = styled.td`
  padding: 12px 16px;
  vertical-align: top;
  color: ${s("text")};
`;
/** A cell holding a code or reference, shown in a fixed-width face. */
export const TdMono = styled(Td)`
  font-family: ${s("fontFamilyMono")};
  font-size: 12px;
  color: ${s("textSecondary")};
  /* A lot number or SKU broken across lines is no longer one identifier. */
  white-space: nowrap;
`;
/** A quieter cell, for anything secondary to the row's subject. */
export const TdMuted = styled(Td)`
  color: ${s("textSecondary")};
`;
/** The line shown in place of rows when there are none. */
export const EmptyRow = styled.td`
  padding: 24px 16px;
  color: ${s("textTertiary")};
`;
/**
 * A grid of cards.
 *
 * Sized by the cards rather than by breakpoints, so a page does not have to
 * pick a column count that its content may not suit. `$min` is the narrowest
 * a card may get before the grid drops a column – it has to be set by the
 * caller, because the same figure behaves differently in a full-width page
 * and in the narrower column of a split layout.
 */
export const CardGrid = styled.ul<{
  $min?: number;
}>`
  display: grid;
  gap: 16px;
  grid-template-columns: ${({ $min }) =>
    `repeat(auto-fill, minmax(${$min ?? 260}px, 1fr))`};
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
`;
/**
 * A list with the bullets taken off.
 *
 * `$divided` separates the items with a hairline instead of a gap, for lists
 * where each row is a record rather than one of several attributes.
 */
export const PlainList = styled.ul<{
  $divided?: boolean;
}>`
  margin: 8px 0 0;
  padding: 0;
  list-style: none;

  & > li + li {
    ${({ $divided }) =>
      $divided
        ? css`
            border-top: 1px solid ${s("divider")};
          `
        : css`
            margin-top: 4px;
          `}
  }
`;
/**
 * Text shown with its first letter raised.
 *
 * The values behind these – a room type, an account kind, a role – are stored
 * lowercase because that is what the API uses; only the display differs.
 */
export const Capitalize = styled.span`
  text-transform: capitalize;
`;
/** A link within a page's content, for `react-router`'s `Link` to be styled as. */
export const TextLink = styled.a`
  color: ${s("link")};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
/** The track of a bar showing how full something is. */
export const Meter = styled.div`
  height: 8px;
  width: 100%;
  overflow: hidden;
  border-radius: 9999px;
  background: ${s("backgroundTertiary")};
`;
/** The filled portion of a `Meter`. */
export const MeterFill = styled.div<{
  $tone: "full" | "some";
}>`
  height: 100%;
  background: ${({ $tone, theme }) =>
    $tone === "full" ? theme.danger : theme.accent};
`;
