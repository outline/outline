import copy from "copy-to-clipboard";
import type { MouseEvent } from "react";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import type { EditorNotice } from "../types";

// Loaded lazily so its browser-only dependency on Radix doesn't enter the
// editor schema's static import graph, which is also used on the server.
const ColorHoverCard = lazy(() => import("./ColorHoverCard"));

/** Time in ms the pointer must rest on the swatch before the card opens. */
const OPEN_DELAY = 400;

/** Time in ms the card stays open after the pointer leaves, to allow travel. */
const CLOSE_DELAY = 200;

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
 * it copies the color to the clipboard, hovering reveals a larger preview and
 * the color translated into other notations.
 */
export function ColorSwatch({ color, luminance, onNotice }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const scheduleOpen = useCallback((value: boolean, delay: number) => {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setOpen(value), delay);
  }, []);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
    scheduleOpen(true, OPEN_DELAY);
  }, [scheduleOpen]);

  const handleMouseLeave = useCallback(
    () => scheduleOpen(false, CLOSE_DELAY),
    [scheduleOpen]
  );

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

  const trigger = (
    <SwatchTarget
      aria-hidden="true"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <Swatch $luminance={luminance} style={{ backgroundColor: color }} />
    </SwatchTarget>
  );

  // A document can contain many swatches, so the card is only loaded and
  // mounted once the pointer has actually reached one.
  if (!hovered) {
    return trigger;
  }

  return (
    <Suspense fallback={trigger}>
      <ColorHoverCard
        color={color}
        open={open}
        onOpenChange={setOpen}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onNotice={onNotice}
      >
        {trigger}
      </ColorHoverCard>
    </Suspense>
  );
}

const Swatch = styled.span<{ $luminance: number }>`
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-clip: padding-box;
  transition: transform 100ms ease;

  /* Outline colors that would otherwise blend into the current background. */
  ${(props) =>
    (props.theme.isDark ? props.$luminance < 0.1 : props.$luminance > 0.85) &&
    css`
      outline: 1px solid ${props.theme.codeBorder};
    `}
`;

/**
 * Wraps the swatch at a fixed size so that scaling on hover doesn't move the
 * bounds the hover card is positioned against.
 */
const SwatchTarget = styled.span`
  display: inline-block;
  width: 0.75em;
  height: 0.75em;
  margin-left: 0.3em;
  vertical-align: -0.05em;
  cursor: var(--pointer);

  &:hover ${Swatch} {
    transform: scale(1.1);
  }

  &:active ${Swatch} {
    transform: scale(0.9);
  }
`;
