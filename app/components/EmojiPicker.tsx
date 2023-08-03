import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import usePickerTheme from "~/hooks/usePickerTheme";

type Props = {
  disclosure: React.ReactElement;
  onEmojiChange: (emoji: string | null) => void;
  emojiPresent: boolean;
};

function EmojiPicker({
  disclosure,
  onEmojiChange,
  emojiPresent,
  ...pickerOptions
}: Props) {
  const { t } = useTranslation();
  const pickerTheme = usePickerTheme();

  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
  });

  const pickerRef = React.useRef<HTMLDivElement>(null);

  const handleEmojiChange = (emoji: any) => {
    popover.hide();
    emoji ? onEmojiChange(emoji.native) : onEmojiChange(null);
  };

  return (
    <>
      <PopoverDisclosure {...popover} onClick={(e) => e.stopPropagation()}>
        {(disclosureProps) =>
          disclosure ? React.cloneElement(disclosure, disclosureProps) : null
        }
      </PopoverDisclosure>
      <PickerPopover
        {...popover}
        baseId="emoji-picker"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        width={352}
        aria-label="emoji-picker"
      >
        {emojiPresent && (
          <RemoveButton neutral hasText onClick={() => handleEmojiChange(null)}>
            {t("Remove")}
          </RemoveButton>
        )}
        <PickerStyles ref={pickerRef}>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiChange}
            theme={pickerTheme}
            previewPosition="none"
            perLine={
              // 28 is picker's observed width when perLine is set to 0
              // and 36 is the default emojiButtonSize
              // Ref: https://github.com/missive/emoji-mart#options--props
              popover.visible && pickerRef.current
                ? Math.floor((pickerRef.current.clientWidth - 28) / 36)
                : 9
            }
            {...pickerOptions}
          />
        </PickerStyles>
      </PickerPopover>
    </>
  );
}

const RemoveButton = styled(Button)`
  margin-left: -12px;
  margin-bottom: 8px;
  border-radius: 16px;
  height: 24px;
  font-size: 12px;
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
  }
`;

const PickerStyles = styled.div`
  margin-left: -24px;
  margin-right: -24px;
  em-emoji-picker {
    --shadow: none;
    --border-radius: 0;
    --rgb-background: ${s("menuBackground")};
    margin-left: auto;
    margin-right: auto;
    min-height: 443px;
  }
`;

export default EmojiPicker;
