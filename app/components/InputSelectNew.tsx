import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { transparentize } from "polished";
import React from "react";
import styled from "styled-components";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
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
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  type TriggerButtonProps,
} from "./primitives/InputSelect";
import {
  SelectItemIndicator,
  SelectItem as SelectItemWrapper,
  SelectButton,
} from "./primitives/components/InputSelect";

type Separator = {
  type: "separator";
};

export type Item = {
  type: "item";
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactElement;
};

export type Option = Item | Separator;

type Props = {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
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

  const [side, setSide] =
    React.useState<
      React.ComponentPropsWithoutRef<typeof SelectContent>["side"]
    >("bottom");
  const [align, setAlign] =
    React.useState<
      React.ComponentPropsWithoutRef<typeof SelectContent>["align"]
    >("start");

  const triggerRef = React.useRef<React.ElementRef<typeof SelectTrigger>>(null);
  const contentRef = React.useRef<React.ElementRef<typeof SelectContent>>(null);

  const window = useWindowSize();
  const isMobile = useMobile();

  const placeholder = `Select a ${ariaLabel.toLowerCase()}`;
  const optionsHaveIcon = options.some(
    (opt) => opt.type === "item" && !!opt.icon
  );

  const renderOption = React.useCallback(
    (option: Option) => {
      if (option.type === "separator") {
        return <SelectSeparator />;
      }

      return (
        <SelectItem
          key={option.value}
          value={option.value}
          reverse={align === "end"}
        >
          <Option option={option} optionsHaveIcon={optionsHaveIcon} />
        </SelectItem>
      );
    },
    [optionsHaveIcon, align]
  );

  const onValueChange = React.useCallback(
    async (val: string) => {
      setLocalValue(val);
      onChange(val);
    },
    [onChange, setLocalValue]
  );

  const allowPointerEvents = React.useCallback((allow: boolean) => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = allow ? "auto" : "none";
    }
  }, []);

  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();

    // If there is at least 300px in the bottom, render it below. Otherwise, flip it.
    setSide(window.height - triggerRect.bottom >= 300 ? "bottom" : "top");

    // Portalled content's DOMRect isn't correctly calculated in the layout effect phase.
    // Use rAF to get the actual position.
    requestAnimationFrame(() => {
      const contentRect = contentRef.current?.getBoundingClientRect();
      // In case the content overflows the right edge, Radix pushes the content to the left to offset for the overflow.
      // Offsetting looks odd at times, so flip the alignment here.
      setAlign(
        (contentRect?.width || 0) <= window.width - triggerRect.left
          ? "start"
          : "end"
      );
    });
  }, [open, window]);

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
      <Select
        open={open}
        onOpenChange={setOpen}
        value={localValue}
        onValueChange={onValueChange}
      >
        <SelectTrigger
          ref={triggerRef}
          placeholder={placeholder}
          {...triggerProps}
        />
        <SelectContent
          ref={contentRef}
          aria-label={ariaLabel}
          side={side}
          align={align}
          onAnimationStart={() => allowPointerEvents(false)}
          onAnimationEnd={() => allowPointerEvents(true)}
        >
          {options.map(renderOption)}
        </SelectContent>
      </Select>
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
          reverse={false}
          data-state={isSelected ? "checked" : "unchecked"}
        >
          <Option option={option} optionsHaveIcon={optionsHaveIcon} />
          {isSelected && <SelectItemIndicator />}
        </SelectItemWrapper>
      );
    },
    [handleSelect, selectedOption, optionsHaveIcon]
  );

  const allowPointerEvents = React.useCallback((allow: boolean) => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = allow ? "auto" : "none";
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
          onAnimationStart={() => allowPointerEvents(false)}
          onAnimationEnd={() => allowPointerEvents(true)}
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
