import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import Separator from "./ContextMenu/Separator";
import Flex from "./Flex";
import { LabelText } from "./Input";
import Scrollable from "./Scrollable";
import { IconWrapper } from "./Sidebar/components/SidebarLink";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "./primitives/Drawer";
import {
  InputSelectRoot,
  InputSelectContent,
  InputSelectItem,
  InputSelectSeparator,
  InputSelectTrigger,
  type TriggerButtonProps,
} from "./primitives/InputSelect";
import {
  SelectItemIndicator,
  SelectItem as SelectItemWrapper,
  SelectButton,
} from "./primitives/components/InputSelect";

type Separator = {
  /* Denotes a horizontal divider line to be rendered in the menu, */
  type: "separator";
};

export type Item = {
  /* Denotes a selectable option in the menu. */
  type: "item";
  /* Representative text shown in the menu for this option. */
  label: string;
  /* Actual value of this option. */
  value: string;
  /* Additional info shown alongside the label.  */
  description?: string;
  /* An icon shown alongside the label.  */
  icon?: React.ReactElement;
};

export type Option = Item | Separator;

type Props = {
  /* Options to display in the select menu. */
  options: Option[];
  /* Current chosen value. */
  value?: string;
  /* Callback when an option is selected. */
  onChange: (value: string) => void;
  /* ARIA label for accessibility. */
  ariaLabel: string;
  /* Label for the select menu. */
  label: string;
  /* When true, label is hidden in an accessible manner. */
  hideLabel?: boolean;
  /* When true, menu is disabled. */
  disabled?: boolean;
  /* When true, width of the menu trigger is restricted. Otherwise, takes up the full width of parent. */
  short?: boolean;
} & TriggerButtonProps;

export function InputSelectNew(props: Props) {
  const {
    options,
    value,
    onChange,
    ariaLabel,
    label,
    hideLabel,
    disabled,
    short,
    ...triggerProps
  } = props;

  const [localValue, setLocalValue] = React.useState(value);
  const [open, setOpen] = React.useState(false);

  const triggerRef =
    React.useRef<React.ElementRef<typeof InputSelectTrigger>>(null);
  const contentRef =
    React.useRef<React.ElementRef<typeof InputSelectContent>>(null);

  const isMobile = useMobile();

  const placeholder = `Select a ${ariaLabel.toLowerCase()}`;
  const optionsHaveIcon = options.some(
    (opt) => opt.type === "item" && !!opt.icon
  );

  const renderOption = React.useCallback(
    (option: Option) => {
      if (option.type === "separator") {
        return <InputSelectSeparator />;
      }

      return (
        <InputSelectItem key={option.value} value={option.value}>
          <Option option={option} optionsHaveIcon={optionsHaveIcon} />
        </InputSelectItem>
      );
    },
    [optionsHaveIcon]
  );

  const onValueChange = React.useCallback(
    async (val: string) => {
      setLocalValue(val);
      onChange(val);
    },
    [onChange, setLocalValue]
  );

  const enablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "none";
    }
  }, []);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (isMobile) {
    return (
      <MobileSelect
        {...props}
        value={localValue}
        onChange={onValueChange}
        placeholder={placeholder}
        optionsHaveIcon={optionsHaveIcon}
      />
    );
  }

  return (
    <Wrapper short={short}>
      <Label text={label} hidden={hideLabel ?? false} />
      <InputSelectRoot
        open={open}
        onOpenChange={setOpen}
        value={localValue}
        onValueChange={onValueChange}
      >
        <InputSelectTrigger
          ref={triggerRef}
          placeholder={placeholder}
          {...triggerProps}
        />
        <InputSelectContent
          ref={contentRef}
          aria-label={ariaLabel}
          onAnimationStart={disablePointerEvents}
          onAnimationEnd={enablePointerEvents}
        >
          {options.map(renderOption)}
        </InputSelectContent>
      </InputSelectRoot>
    </Wrapper>
  );
}

type MobileSelectProps = Props & {
  placeholder: string;
  optionsHaveIcon: boolean;
};

function MobileSelect(props: MobileSelectProps) {
  const {
    options,
    value,
    onChange,
    ariaLabel,
    label,
    hideLabel,
    disabled,
    short,
    placeholder,
    optionsHaveIcon,
    ...triggerProps
  } = props;

  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<React.ElementRef<typeof DrawerContent>>(null);

  const selectedOption = React.useMemo(
    () =>
      value
        ? options.find((opt) => opt.type === "item" && opt.value === value)
        : undefined,
    [value, options]
  );

  const handleSelect = React.useCallback(
    async (val: string) => {
      setOpen(false);
      onChange(val);
    },
    [onChange]
  );

  const renderOption = React.useCallback(
    (option: Option) => {
      if (option.type === "separator") {
        return <Separator />;
      }

      const isSelected = option === selectedOption;

      return (
        <SelectItemWrapper
          key={option.value}
          onClick={() => handleSelect(option.value)}
          data-state={isSelected ? "checked" : "unchecked"}
        >
          <Option option={option} optionsHaveIcon={optionsHaveIcon} />
          {isSelected && <SelectItemIndicator />}
        </SelectItemWrapper>
      );
    },
    [handleSelect, selectedOption, optionsHaveIcon]
  );

  const enablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "none";
    }
  }, []);

  return (
    <Wrapper>
      <Label text={label} hidden={hideLabel ?? false} />
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <SelectButton
            {...triggerProps}
            neutral
            disclosure
            data-placeholder={selectedOption ? false : ""}
          >
            {selectedOption ? (
              <Option
                option={selectedOption as Item}
                optionsHaveIcon={optionsHaveIcon}
              />
            ) : (
              <>{placeholder}</>
            )}
          </SelectButton>
        </DrawerTrigger>
        <DrawerContent
          ref={contentRef}
          aria-label={ariaLabel}
          onAnimationStart={disablePointerEvents}
          onAnimationEnd={enablePointerEvents}
        >
          <DrawerTitle hidden={!label}>{label ?? ariaLabel}</DrawerTitle>
          <StyledScrollable hiddenScrollbars>
            {options.map(renderOption)}
          </StyledScrollable>
        </DrawerContent>
      </Drawer>
    </Wrapper>
  );
}

function Label({ text, hidden }: { text: string; hidden: boolean }) {
  const labelText = <LabelText>{text}</LabelText>;

  return hidden ? (
    <VisuallyHidden.Root>{labelText}</VisuallyHidden.Root>
  ) : (
    labelText
  );
}

function Option({
  option,
  optionsHaveIcon,
}: {
  option: Item;
  optionsHaveIcon: boolean;
}) {
  const icon = optionsHaveIcon ? (
    option.icon ? (
      <IconWrapper>{option.icon}</IconWrapper>
    ) : (
      <IconSpacer />
    )
  ) : null;

  return (
    <OptionContainer align="center">
      {icon}
      {option.label}
      {option.description && (
        <>
          &nbsp;
          <Description type="tertiary" size="small" ellipsis>
            – {option.description}
          </Description>
        </>
      )}
    </OptionContainer>
  );
}

const Wrapper = styled.label<{ short?: boolean }>`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

const OptionContainer = styled(Flex)`
  min-height: 24px;
`;

const Description = styled(Text)`
  @media (hover: hover) {
    &:hover,
    &:focus {
      color: ${(props) => transparentize(0.5, props.theme.accentText)};
    }
  }
`;

const IconSpacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledScrollable = styled(Scrollable)`
  max-height: 75vh;
`;
