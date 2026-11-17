import * as React from "react";
import { DayPicker } from "react-day-picker";
import styled from "styled-components";
import { s } from "../styles";

type Props = React.ComponentProps<typeof DayPicker>;

/**
 * A themed calendar built on react-day-picker. It is styled from scratch (the
 * library's base stylesheet is intentionally not relied upon) so that it looks
 * consistent everywhere it is used. Outside (previous/next month) days are
 * shown de-emphasised, the selected day is a solid accent-filled circle, and
 * today is highlighted with the accent colour.
 *
 * @param props the underlying react-day-picker props; `showOutsideDays` and
 * `fixedWeeks` default to true but may be overridden.
 * @returns the rendered calendar.
 */
export function Calendar(props: Props) {
  return (
    <Wrapper>
      <DayPicker showOutsideDays fixedWeeks {...props} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  color: ${s("text")};

  .rdp-root {
    position: relative;
    margin: 0;
  }

  .rdp-months {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 24px;
  }

  /* Months sit side by side, and stack when there is not enough space. */
  .rdp-month {
    flex: 1 1 252px;
  }

  .rdp-month_caption {
    display: flex;
    align-items: center;
    height: 28px;
    margin-bottom: 8px;
  }

  .rdp-caption_label {
    font-size: 14px;
    font-weight: 600;
    color: ${s("text")};
  }

  /* The navigation is shown once, at the top end of the months. */
  .rdp-nav {
    position: absolute;
    top: 0;
    inset-inline-end: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 2px;
    height: 28px;
  }

  .rdp-button_previous,
  .rdp-button_next {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 4px;
    color: ${s("textSecondary")};
    cursor: var(--pointer);
    transition: background 100ms ease;

    &:hover:not([aria-disabled="true"]) {
      background: ${s("listItemHoverBackground")};
    }

    &:focus-visible {
      outline: 2px solid ${s("accent")};
      outline-offset: -2px;
    }

    &[aria-disabled="true"] {
      opacity: 0.4;
      cursor: default;
    }
  }

  .rdp-chevron {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .rdp-root[dir="rtl"] .rdp-chevron {
    transform: rotate(180deg);
  }

  .rdp-month_grid {
    border-collapse: collapse;
    width: 100%;
  }

  .rdp-weekday {
    font-size: 12px;
    font-weight: 500;
    text-transform: none;
    color: ${s("textTertiary")};
    padding: 4px 0;
    text-align: center;
  }

  /* Each day cell holds a button, which carries the visual state. */
  .rdp-day {
    padding: 1px;
    text-align: center;
  }

  .rdp-day_button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 50%;
    font-family: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: ${s("text")};
    cursor: var(--pointer);
    transition: background 100ms ease;

    &:hover:not([disabled]) {
      background: ${s("listItemHoverBackground")};
    }

    &:focus-visible:not([disabled]) {
      outline: 2px solid ${s("accent")};
      outline-offset: -2px;
    }
  }

  /* Today, when not selected, is emphasised with the accent colour. */
  .rdp-today:not(.rdp-selected) .rdp-day_button {
    font-weight: 700;
    color: ${s("accent")};
  }

  /* Days belonging to the previous/next month are clearly de-emphasised. */
  .rdp-outside .rdp-day_button {
    color: ${s("textTertiary")};
    opacity: 0.5;
  }

  .rdp-disabled .rdp-day_button {
    color: ${s("textTertiary")};
    opacity: 0.4;
    cursor: default;
  }

  /* The selected day is a solid accent-filled circle. */
  .rdp-selected .rdp-day_button,
  .rdp-selected .rdp-day_button:hover {
    background: ${s("accent")};
    color: ${s("accentText")};
    font-weight: 500;
    opacity: 1;
  }

  /* The days between the start and end of a range are softly highlighted. */
  .rdp-range_middle .rdp-day_button,
  .rdp-range_middle .rdp-day_button:hover {
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
    font-weight: 400;
  }
`;
