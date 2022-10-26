import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import {
  usePopoverState,
  Popover as ReakitPopover,
  PopoverDisclosure,
  PopoverArrow,
  PopoverProps,
} from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";

type Props = PopoverProps & {
  disclosure: any;
  children: React.ReactNode;
  popoverState?: any;
  tabIndex?: number;
  showPopoverArray?: boolean;
};

const Popover: React.FC<Props> = ({
  disclosure,
  children,
  popoverState,
  showPopoverArray,
  ...rest
}) => {
  const popover = usePopoverState(popoverState);

  return (
    <>
      <PopoverDisclosure
        {...popover}
        ref={disclosure.ref}
        {...disclosure.props}
      >
        {(disclosureProps) => React.cloneElement(disclosure, disclosureProps)}
      </PopoverDisclosure>
      <BasePopover {...popover} {...rest}>
        {showPopoverArray && <PopoverArrow {...popover} />}
        {children}
      </BasePopover>
    </>
  );
};

type EmojiPickerProps = {
  disclosure: React.ReactNode;
  onEmojiSelect: (emoji: string) => void;
  onEmojiRemove: () => void;
  theme: string;
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  disclosure,
  onEmojiSelect,
  onEmojiRemove,
  theme,
  ...pickerOptions
}) => {
  const handleEmojiSelect = async (emoji: any) => {
    await onEmojiSelect(emoji.native);
  };

  return (
    <Popover
      disclosure={disclosure}
      baseId="emoji-picker"
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip tooltip="Remove emoji" placement="top">
        <NudeButton onClick={onEmojiRemove}>
          <CloseIcon />
        </NudeButton>
      </Tooltip>
      <Picker
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme={theme}
        {...pickerOptions}
      />
    </Popover>
  );
};

const BasePopover = styled(ReakitPopover)`
  z-index: ${depths.popover};
`;

export default EmojiPicker;
