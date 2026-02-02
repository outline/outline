import deburr from "lodash/deburr";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import Flex from "./Flex";
import Input from "./Input";
import { LabelText } from "./Input";
import NudeButton from "./NudeButton";
import Scrollable from "./Scrollable";
import Tooltip from "./Tooltip";
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

type Props = Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange"> & {
  /* Options to display in the select menu. */
  options: Option[];
  /* Current chosen value. */
  value?: string | null;
  /* Callback when an option is selected. */
  onChange: (value: string) => void;
  /* Label for the select menu. */
  label: string;
  /* When true, label is hidden in an accessible manner. */
  hideLabel?: boolean;
  /* When true, menu is disabled. */
  disabled?: boolean;
  /* When true, width of the menu trigger is restricted. Otherwise, takes up the full width of parent. */
  short?: boolean;
  /** Display a tooltip with the descriptive help text about the select menu. */
  help?: string;
  /* When true, enables search functionality in the dropdown. */
  searchable?: boolean;
} & TriggerButtonProps;

export const InputSelect = React.forwardRef<HTMLButtonElement, Props>(
  (props, ref) => {
    const {
      options,
      value,
      onChange,
      label,
      hideLabel,
      short,
      help,
      searchable,
      ...triggerProps
    } = props;

    const { t } = useTranslation();
    const [localValue, setLocalValue] = React.useState(value);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    const contentRef =
      React.useRef<React.ElementRef<typeof InputSelectContent>>(null);

    const isMobile = useMobile();

    const placeholder = `Select a ${label.toLowerCase()}`;
    const optionsHaveIcon = options.some(
      (opt) => opt.type === "item" && !!opt.icon
    );

    const filteredOptions = React.useMemo(() => {
      if (!searchable || !query) {
        return options;
      }

      const normalizedQuery = deburr(query.toLowerCase());
      return options.filter((option) => {
        if (option.type === "separator") {
          return true;
        }
        return deburr(option.label.toLowerCase()).includes(normalizedQuery);
      });
    }, [options, query, searchable]);

    const renderOption = React.useCallback(
      (option: Option, idx: number) => {
        if (option.type === "separator") {
          return <InputSelectSeparator key={`separator-${idx}`} />;
        }

        return (
          <InputSelectItem key={option.value} value={option.value}>
            <Option option={option} optionsHaveIcon={optionsHaveIcon} />
          </InputSelectItem>
        );
      },
      [optionsHaveIcon]
    );

    React.useEffect(() => {
      if (open && searchable) {
        // Focus search input when dropdown opens
        const timeoutId = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timeoutId);
      }
      // Clear query when dropdown closes
      if (!open) {
        setQuery("");
      }
    }, [open, searchable]);

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
          ref={ref}
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
        <Label text={label} hidden={hideLabel ?? false} help={help} />
        <InputSelectRoot
          open={open}
          onOpenChange={setOpen}
          value={localValue ?? undefined}
          onValueChange={onValueChange}
        >
          <InputSelectTrigger
            ref={ref}
            placeholder={placeholder}
            {...triggerProps}
          />
          <InputSelectContent
            ref={contentRef}
            aria-label={label}
            onAnimationStart={disablePointerEvents}
            onAnimationEnd={enablePointerEvents}
          >
            {searchable && (
              <SearchInputWrapper>
                <Input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(ev) => setQuery(ev.target.value)}
                  placeholder={`${t("Search")}…`}
                  labelHidden
                  margin={0}
                  onKeyDown={(ev) => {
                    // Prevent closing dropdown on Escape when searching
                    if (ev.key === "Escape") {
                      ev.stopPropagation();
                      if (query) {
                        setQuery("");
                      } else {
                        setOpen(false);
                      }
                    }
                  }}
                />
              </SearchInputWrapper>
            )}
            {filteredOptions.map(renderOption)}
          </InputSelectContent>
        </InputSelectRoot>
      </Wrapper>
    );
  }
);
InputSelect.displayName = "InputSelect";

type MobileSelectProps = Props & {
  placeholder: string;
  optionsHaveIcon: boolean;
};

const MobileSelect = React.forwardRef<HTMLButtonElement, MobileSelectProps>(
  (props, ref) => {
    const {
      options,
      value,
      onChange,
      label,
      hideLabel,
      disabled,
      short,
      placeholder,
      optionsHaveIcon,
      ...triggerProps
    } = props;

    const [open, setOpen] = React.useState(false);
    const contentRef =
      React.useRef<React.ElementRef<typeof DrawerContent>>(null);

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
      (option: Option, idx: number) => {
        if (option.type === "separator") {
          return <InputSelectSeparator key={`separator-${idx}`} />;
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
              ref={ref}
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
            aria-label={label}
            onAnimationStart={disablePointerEvents}
            onAnimationEnd={enablePointerEvents}
          >
            <DrawerTitle hidden={!label}>{label}</DrawerTitle>
            <StyledScrollable hiddenScrollbars>
              {options.map(renderOption)}
            </StyledScrollable>
          </DrawerContent>
        </Drawer>
      </Wrapper>
    );
  }
);
MobileSelect.displayName = "InputSelect";

function Label({
  text,
  hidden,
  help,
}: {
  text: string;
  hidden: boolean;
  help?: string;
}) {
  const content = (
    <Flex align="center" gap={2} style={{ marginBottom: "4px" }}>
      <LabelText style={{ paddingBottom: 0 }}>{text}</LabelText>
      {help ? (
        <Tooltip content={help}>
          <TooltipButton size={18}>
            <QuestionMarkIcon size={18} />
          </TooltipButton>
        </Tooltip>
      ) : null}
    </Flex>
  );

  return hidden ? (
    <VisuallyHidden.Root>{content}</VisuallyHidden.Root>
  ) : (
    content
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
          <Text type="tertiary" size="small" ellipsis>
            – {option.description}
          </Text>
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

const IconWrapper = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 24px;
  height: 24px;
  margin-left: -4px;
  margin-right: 4px;
  overflow: hidden;
  flex-shrink: 0;
`;

const IconSpacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledScrollable = styled(Scrollable)`
  max-height: 75vh;
`;

const TooltipButton = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:hover,
  &[aria-expanded="true"] {
    background: none !important;
  }
`;

const SearchInputWrapper = styled.div`
  padding: 4px;
  border-bottom: 1px solid ${s("divider")};
  margin-bottom: 4px;
`;
