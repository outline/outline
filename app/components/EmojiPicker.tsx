import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { depths } from "@shared/styles";
import Button from "~/components/Button";
import Popover from "~/components/Popover";

type Props = {
  disclosure: React.ReactElement;
  onEmojiChange: (emoji: string | null) => void;
  pickerTheme: string;
  emojiPresent: boolean;
};

const EmojiPicker: React.FC<Props> = ({
  disclosure,
  onEmojiChange,
  pickerTheme,
  emojiPresent,
  ...pickerOptions
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
  });

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
          <RemoveButton
            neutral
            hasText
            onClick={() => handleEmojiChange(null)}
            theme={theme}
          >
            {t("Remove")}
          </RemoveButton>
        )}
        <PickerStyles theme={theme}>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiChange}
            theme={pickerTheme}
            previewPosition="none"
            {...pickerOptions}
          />
        </PickerStyles>
      </PickerPopover>
    </>
  );
};

const RemoveButton = styled(Button)`
  margin-left: -12px;
  margin-bottom: 8px;
  border-radius: 16px;
  color: ${(props) => props.theme.textTertiary};
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
    max-height: 488px;
  }
`;

const PickerStyles = styled.div`
  margin-left: -24px;
  margin-right: -24px;
  em-emoji-picker {
    --shadow: none;
    --border-radius: 0;
    --rgb-background: ${(props) => props.theme.menuBackground};
  }
`;

export default EmojiPicker;
