import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { SmileyIcon } from "outline-icons";
import { parseToRgb } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { depths, s } from "@shared/styles";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import usePickerTheme from "~/hooks/usePickerTheme";
import useUserLocale from "~/hooks/useUserLocale";
import { hover } from "~/styles";
import Flex from "./Flex";

type Props = {
  /** The selected emoji, if any */
  value?: string | null;
  /** Callback when an emoji is selected */
  onChange: (emoji: string | null) => void | Promise<void>;
  /** Callback when the picker is clicked outside of */
  onClickOutside: () => void;
  /** Whether to auto focus the search input on open */
  autoFocus?: boolean;
  /** Class name to apply to the trigger button */
  className?: string;
};

function EmojiPicker({
  value,
  onChange,
  onClickOutside,
  autoFocus,
  className,
}: Props) {
  const { t } = useTranslation();
  const pickerTheme = usePickerTheme();
  const theme = useTheme();
  const locale = useUserLocale(true) ?? "en";

  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
    unstable_offset: [0, 0],
  });

  const [emojisPerLine, setEmojisPerLine] = React.useState(9);

  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (popover.visible && pickerRef.current) {
      // 28 is picker's observed width when perLine is set to 0
      // and 36 is the default emojiButtonSize
      // Ref: https://github.com/missive/emoji-mart#options--props
      setEmojisPerLine(Math.floor((pickerRef.current.clientWidth - 28) / 36));
    }
  }, [popover.visible]);

  const handleEmojiChange = React.useCallback(
    async (emoji) => {
      popover.hide();
      await onChange(emoji ? emoji.native : null);
    },
    [popover, onChange]
  );

  const handleClick = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      if (popover.visible) {
        popover.hide();
      } else {
        popover.show();
      }
    },
    [popover]
  );

  const handleClickOutside = React.useCallback(() => {
    // It was observed that onClickOutside got triggered
    // even when the picker wasn't open or opened at all.
    // Hence, this guard here...
    if (popover.visible) {
      onClickOutside();
    }
  }, [popover.visible, onClickOutside]);

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <EmojiButton
            {...props}
            className={className}
            onClick={handleClick}
            icon={
              value ? (
                <Emoji size={32} align="center" justify="center">
                  {value}
                </Emoji>
              ) : (
                <StyledSmileyIcon size={32} color={theme.textTertiary} />
              )
            }
            neutral
            borderOnHover
          />
        )}
      </PopoverDisclosure>
      <PickerPopover
        {...popover}
        tabIndex={0}
        // This prevents picker from closing when any of its
        // children are focused, e.g, clicking on search bar or
        // a click on skin tone button
        onClick={(e) => e.stopPropagation()}
        width={352}
        aria-label={t("Emoji Picker")}
      >
        {value && (
          <RemoveButton neutral onClick={() => handleEmojiChange(null)}>
            {t("Remove")}
          </RemoveButton>
        )}
        <PickerStyles ref={pickerRef}>
          <Picker
            // https://github.com/missive/emoji-mart/issues/800
            locale={locale === "ko" ? "kr" : locale}
            data={data}
            onEmojiSelect={handleEmojiChange}
            theme={pickerTheme}
            previewPosition="none"
            perLine={emojisPerLine}
            onClickOutside={handleClickOutside}
            autoFocus={autoFocus}
          />
        </PickerStyles>
      </PickerPopover>
    </>
  );
}

export const EmojiButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;

  &: ${hover},
  &:active,
  &[aria-expanded= "true"] {
    opacity: 1 !important;
  }
`;

export const Emoji = styled(Flex)<{ size?: number }>`
  line-height: 1.6;
  ${(props) => (props.size ? `font-size: ${props.size}px` : "")}
`;

const StyledSmileyIcon = styled(SmileyIcon)`
  flex-shrink: 0;

  @media print {
    display: none;
  }
`;

const RemoveButton = styled(Button)`
  margin-left: -12px;
  margin-bottom: 8px;
  border-radius: 6px;
  height: 24px;
  font-size: 13px;

  > :first-child {
    min-height: unset;
    line-height: unset;
  }
`;

const PickerPopover = styled(Popover)`
  z-index: ${depths.popover};
  > :first-child {
    padding-top: 8px;
    padding-bottom: 0;
    max-height: 488px;
    overflow: unset;
  }
`;

const PickerStyles = styled.div`
  margin-left: -24px;
  margin-right: -24px;
  em-emoji-picker {
    --shadow: none;
    --font-family: ${s("fontFamily")};
    --rgb-background: ${(props) =>
      Object.values(parseToRgb(props.theme.menuBackground)).join(", ")};
    --border-radius: 6px;
    margin-left: auto;
    margin-right: auto;
    min-height: 443px;
  }
`;

export default EmojiPicker;
