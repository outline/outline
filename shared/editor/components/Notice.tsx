import { transparentize } from "polished";
import * as React from "react";
import { useTheme } from "styled-components";
import Icon from "../../components/Icon";
import { getNoticePreset, parseNoticeColor } from "../lib/notice";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import { IconPickerContext } from "./IconPickerContext";

type Props = Omit<ComponentProps, "theme"> & {
  /** Called with the icon and color chosen for the notice, or nulls to reset. */
  onChangeIcon: (icon: string | null, color: string | null) => void;
};

const iconSize = 24;

/**
 * Renders a notice block. The icon and color default to those of the notice's
 * preset style, and can be overridden per notice by clicking the icon.
 *
 * @returns the notice block.
 */
export function Notice({ node, isEditable, contentRef, onChangeIcon }: Props) {
  const theme = useTheme();
  const IconPicker = React.useContext(IconPickerContext);
  const preset = getNoticePreset(node.attrs.style);

  const customColor = parseNoticeColor(node.attrs.color);
  const icon = node.attrs.icon ?? preset.icon;
  const color = customColor ?? theme[preset.color];
  const initial = node.textContent;

  const handleChange = React.useCallback(
    (nextIcon: string | null, nextColor: string | null) => {
      // The preset icon is passed to the picker so that a color can be chosen
      // without choosing an icon first, so store it as if it were unset.
      onChangeIcon(nextIcon === preset.icon ? null : nextIcon, nextColor);
    },
    [onChangeIcon, preset.icon]
  );

  const iconElement = (
    <Icon value={icon} color={color} size={iconSize} initial={initial} />
  );

  const editable = isEditable && IconPicker;

  return (
    <div
      className={`${EditorStyleHelper.notice} ${node.attrs.style}`}
      data-icon={node.attrs.icon ?? undefined}
      data-color={customColor ?? undefined}
      style={
        customColor
          ? {
              background: transparentize(0.9, customColor),
              borderLeftColor: customColor,
            }
          : undefined
      }
    >
      <div
        className={EditorStyleHelper.noticeIcon}
        contentEditable={false}
        // Keep the editor selection where it is when the picker is opened.
        onMouseDown={editable ? (event) => event.preventDefault() : undefined}
      >
        {editable ? (
          <React.Suspense fallback={iconElement}>
            <IconPicker
              icon={icon}
              color={color}
              size={iconSize}
              initial={initial}
              popoverPosition="bottom-start"
              allowDelete={!!node.attrs.icon || !!customColor}
              borderOnHover
              onChange={handleChange}
            >
              {iconElement}
            </IconPicker>
          </React.Suspense>
        ) : (
          iconElement
        )}
      </div>
      <div className={EditorStyleHelper.noticeContent} ref={contentRef} />
    </div>
  );
}
