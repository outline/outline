import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
import Tooltip from "~/components/Tooltip";

type Props = {
  disclosure: React.ReactElement;
  onEmojiSelect: (emoji: string) => void;
  onEmojiRemove: () => void;
  theme: string;
};

const EmojiPicker: React.FC<Props> = ({
  disclosure,
  onEmojiSelect,
  onEmojiRemove,
  theme,
  ...pickerOptions
}) => {
  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
  });

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
  };

  return (
    <>
      <PopoverDisclosure {...popover} onClick={(e) => e.stopPropagation()}>
        {(disclosureProps) =>
          disclosure ? React.cloneElement(disclosure, disclosureProps) : null
        }
      </PopoverDisclosure>
      <Popover
        {...popover}
        baseId="emoji-picker"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        width={352}
        scrollable={false}
      >
        <Tooltip tooltip="Remove emoji" placement="top">
          <NudeButton onClick={onEmojiRemove}>
            <CloseIcon />
          </NudeButton>
        </Tooltip>
        <PickerStyles>
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme={theme}
            {...pickerOptions}
          />
        </PickerStyles>
      </Popover>
    </>
  );
};

const PickerStyles = styled.div`
  margin-left: -24px;
  margin-right: -24px;
  em-emoji-picker {
    --shadow: none;
    --border-radius: 0;
    --padding: 8px;
  }
`;

export default EmojiPicker;
