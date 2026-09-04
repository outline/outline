import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";

/** A dot separating two pieces of meta information. */
export const Separator = styled.span`
  padding: 0 0.4em;

  &::after {
    content: "•";
  }
`;

/** A button that visually matches the surrounding meta text. */
export const MetaButton = styled(NudeButton)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: auto;
  height: auto;
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: inherit;

  &:hover {
    text-decoration: underline;
  }
`;

/** Lays out a line of meta information about a document or collection. */
export const metaStyles = css<{ $rtl?: boolean }>`
  justify-content: ${(props) => (props.$rtl ? "flex-end" : "flex-start")};
  color: ${s("textTertiary")};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

/**
 * Additional styles for a line of meta information rendered directly beneath a
 * page title. Composed by `HeaderMeta`, and applied directly by consumers that
 * style an existing meta component rather than rendering their own.
 */
export const headerMetaStyles = css`
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  user-select: none;
  z-index: 1;

  ${breakpoint("mobile", "tablet")`
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.6;

    ${Separator} {
      display: none;
    }
  `}

  a {
    color: inherit;
    cursor: var(--pointer);

    &:hover {
      text-decoration: underline;
    }
  }

  @media print {
    display: none;
  }
`;

/**
 * A line of meta information rendered directly beneath a page title, stacking
 * into a list on mobile and hidden when printing.
 */
export const HeaderMeta = styled(Flex)<{ $rtl?: boolean }>`
  ${metaStyles}
  ${headerMetaStyles}
`;
