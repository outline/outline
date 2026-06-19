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
  padding: 12px;
  color: ${s("text")};

  .rdp {
    margin: 0;
  }

  /* Visually-hidden accessibility labels (would otherwise show without the
     base stylesheet). */
  .rdp-vhidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
    appearance: none;
  }

  .rdp-month {
    width: 100%;
  }

  .rdp-caption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px 8px;
  }

  .rdp-caption_label {
    font-size: 14px;
    font-weight: 600;
    color: ${s("text")};
  }

  .rdp-nav {
    display: flex;
    gap: 2px;
  }

  .rdp-nav_button {
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
    cursor: pointer;
    transition: background 100ms ease;

    &:hover {
      background: ${s("listItemHoverBackground")};
    }
  }

  .rdp-nav_icon {
    width: 16px;
    height: 16px;
  }

  .rdp-table {
    border-collapse: collapse;
    width: 100%;
  }

  .rdp-head_cell {
    font-size: 12px;
    font-weight: 500;
    text-transform: none;
    color: ${s("textTertiary")};
    padding: 4px 0;
    text-align: center;
  }

  .rdp-cell {
    padding: 1px;
    text-align: center;
  }

  .rdp-day {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 0;
    background: none;
    border-radius: 50%;
    font-family: inherit;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: ${s("text")};
    cursor: pointer;
    transition: background 100ms ease;

    &:hover:not([disabled]):not(.rdp-day_selected) {
      background: ${s("listItemHoverBackground")};
    }

    &:focus-visible:not([disabled]) {
      outline: 2px solid ${s("accent")};
      outline-offset: -2px;
    }
  }

  /* Today, when not selected, is emphasised with the accent colour. */
  .rdp-day_today:not(.rdp-day_selected) {
    font-weight: 700;
    color: ${s("accent")};
  }

  /* Days belonging to the previous/next month are clearly de-emphasised. */
  .rdp-day_outside {
    color: ${s("textTertiary")};
    opacity: 0.5;
  }

  .rdp-day[disabled] {
    color: ${s("textTertiary")};
    opacity: 0.4;
    cursor: default;
  }

  /* The selected day is a solid accent-filled circle. */
  .rdp-day_selected,
  .rdp-day_selected:hover,
  .rdp-day_selected:focus-visible {
    background: ${s("accent")};
    color: ${s("accentText")};
    font-weight: 500;
    opacity: 1;
  }
`;
