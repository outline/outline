import copy from "copy-to-clipboard";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import type { EditorNotice } from "../types";

interface Props {
  /** The CSS color the swatch represents, in its original notation. */
  color: string;
  /** The relative luminance of the color, used to pick an outline. */
  luminance: number;
  /** Callback used to surface a notice to the user. */
  onNotice?: EditorNotice;
}

/**
 * A small colored circle rendered after a CSS color inside inline code. Clicking
 * it copies the color to the clipboard.
 */
export function ColorSwatch({ color, luminance, onNotice }: Props) {
  const { t } = useTranslation();

  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Prevent the editor from moving the cursor into the code mark on click.
    event.preventDefault();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      copy(color);
      onNotice?.(t("Copied to clipboard"));
    },
    [color, onNotice, t]
  );

  return (
    <Swatch
      aria-hidden="true"
      title={t("Click to copy")}
      $luminance={luminance}
      style={{ backgroundColor: color }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    />
  );
}

const Swatch = styled.span<{ $luminance: number }>`
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  margin-left: 0.3em;
  vertical-align: -0.05em;
  border-radius: 50%;
  background-clip: padding-box;
  cursor: var(--pointer);
  transition: transform 100ms ease;

  /* Outline colors that would otherwise blend into the current background. */
  ${(props) =>
    (props.theme.isDark ? props.$luminance < 0.1 : props.$luminance > 0.85) &&
    css`
      outline: 1px solid ${props.theme.codeBorder};
    `}

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.9);
  }
`;
