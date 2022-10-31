import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import {
  useDialogState,
  Dialog as BaseDialog,
  DialogDisclosure,
  DialogProps as DProps,
} from "reakit/Dialog";
import {
  usePopoverState,
  Popover as ReakitPopover,
  PopoverDisclosure,
  PopoverArrow,
  PopoverProps as PProps,
} from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { Position, Backdrop } from "~/components/ContextMenu";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";

type PopoverProps = PProps & {
  disclosure: any;
  children: React.ReactNode;
  popoverState?: any;
  dialogState?: any;
  tabIndex?: number;
  showPopoverArrow?: boolean;
};

type DialogProps = DProps & {
  disclosure: any;
  children: (props: any) => React.ReactNode;
  dialogState?: any;
  tabIndex?: number;
};

const Popover: React.FC<PopoverProps> = ({
  disclosure,
  children,
  popoverState,
  showPopoverArrow,
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
        {showPopoverArrow && <PopoverArrow {...popover} />}
        {children}
      </BasePopover>
    </>
  );
};

const Dialog: React.FC<DialogProps> = ({
  disclosure,
  children,
  dialogState,
  ...props
}) => {
  const dialog = useDialogState(dialogState);
  return (
    <>
      <DialogDisclosure {...dialog} ref={disclosure.ref} {...disclosure.props}>
        {(disclosureProps) => React.cloneElement(disclosure, disclosureProps)}
      </DialogDisclosure>
      <BaseDialog {...dialog} {...props}>
        {children({ dialog })}
      </BaseDialog>
    </>
  );
};

type EmojiPickerProps = {
  disclosure: React.ReactNode;
  onEmojiSelect: (emoji: string) => void;
  onEmojiRemove: () => void;
  theme: string;
};

const PickerContainer = React.forwardRef((props: any, ref: any) => {
  return <Position ref={ref} {...props} />;
});

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  disclosure,
  onEmojiSelect,
  onEmojiRemove,
  theme,
  ...pickerOptions
}) => {
  const isMobile = useMobile();
  const ref = React.useRef<HTMLDivElement>(null);

  const [pickerWidth, setPickerWidth] = React.useState<number | undefined>(0);

  const resizeObserver = new ResizeObserver(() => {
    if (ref.current?.clientWidth !== pickerWidth) {
      setPickerWidth(ref.current?.clientWidth);
    }
  });

  React.useEffect(() => {
    if (ref.current) {
      resizeObserver.observe(ref.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  });

  const handleEmojiSelect = async (emoji: any) => {
    await onEmojiSelect(emoji.native);
  };

  if (isMobile) {
    return (
      <Dialog disclosure={disclosure} baseId="emoji-picker" tabIndex={0}>
        {({ dialog }: any) => (
          <>
            <Backdrop
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                dialog.hide();
              }}
            />
            <PickerContainer ref={ref} onClick={dialog.hide}>
              <Tooltip tooltip="Remove emoji" placement="top">
                <NudeButton onClick={onEmojiRemove}>
                  <CloseIcon />
                </NudeButton>
              </Tooltip>
              <PickerStyles onClick={(e) => e.stopPropagation()}>
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme={theme}
                  perLine={
                    // 28 is picker's width when perLine is set to 0
                    // and 36 is the default emojiButtonSize
                    pickerWidth ? Math.floor((pickerWidth - 28) / 36) : 9
                  }
                  {...pickerOptions}
                />
              </PickerStyles>
            </PickerContainer>
          </>
        )}
      </Dialog>
    );
  }

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

const PickerStyles = styled.div`
  em-emoji-picker {
    margin-left: auto;
    margin-right: auto;
  }
`;

export default EmojiPicker;
