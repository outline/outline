import {
  Select,
  SelectOption,
  useSelectState,
  useSelectPopover,
  SelectPopover,
} from "@renderlesskit/react";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { css } from "styled-components";
import Button, { Inner } from "~/components/Button";
import Text from "~/components/Text";
import useMenuHeight from "~/hooks/useMenuHeight";
import { Position, Background, Backdrop, Placement } from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";

export type Option = {
  label: string | JSX.Element;
  value: string;
};

export type Props = {
  id?: string;
  name?: string;
  value?: string | null;
  label?: string;
  nude?: boolean;
  ariaLabel: string;
  short?: boolean;
  disabled?: boolean;
  className?: string;
  labelHidden?: boolean;
  icon?: React.ReactNode;
  options: Option[];
  note?: React.ReactNode;
  onChange: (value: string | null) => void;
};

const getOptionFromValue = (options: Option[], value: string | null) => {
  return options.find((option) => option.value === value);
};

const InputSelect = (props: Props) => {
  const {
    value = null,
    label,
    className,
    labelHidden,
    options,
    short,
    ariaLabel,
    onChange,
    disabled,
    note,
    icon,
    ...rest
  } = props;

  const select = useSelectState({
    gutter: 0,
    modal: true,
    selectedValue: value,
  });

  const popOver = useSelectPopover({
    ...select,
    hideOnClickOutside: true,
    preventBodyScroll: true,
    disabled,
  });

  const previousValue = React.useRef<string | null>(value);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const selectedRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = React.useState(0);
  const minWidth = buttonRef.current?.offsetWidth || 0;
  const maxHeight = useMenuHeight(
    select.visible,
    select.unstable_disclosureRef
  );
  const wrappedLabel = <LabelText>{label}</LabelText>;
  const selectedValueIndex = options.findIndex(
    (option) => option.value === select.selectedValue
  );

  React.useEffect(() => {
    if (previousValue.current === select.selectedValue) {
      return;
    }
    previousValue.current = select.selectedValue;

    async function load() {
      await onChange(select.selectedValue);
    }

    load();
  }, [onChange, select.selectedValue]);

  // Ensure selected option is visible when opening the input
  React.useEffect(() => {
    if (!select.animating && selectedRef.current) {
      scrollIntoView(selectedRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
        block: "start",
      });
    }
  }, [select.animating]);

  React.useLayoutEffect(() => {
    if (select.visible) {
      const offset = Math.round(
        (selectedRef.current?.getBoundingClientRect().top || 0) -
          (contentRef.current?.getBoundingClientRect().top || 0)
      );
      setOffset(offset);
    }
  }, [select.visible]);

  return (
    <>
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}

        <Select {...select} disabled={disabled} {...rest} ref={buttonRef}>
          {(props) => (
            <StyledButton
              neutral
              disclosure
              className={className}
              icon={icon}
              {...props}
            >
              {getOptionFromValue(options, select.selectedValue)?.label || (
                <Placeholder>Select a {ariaLabel.toLowerCase()}</Placeholder>
              )}
            </StyledButton>
          )}
        </Select>
        <SelectPopover {...select} {...popOver} aria-label={ariaLabel}>
          {(
            props: React.HTMLAttributes<HTMLDivElement> & {
              placement: Placement;
            }
          ) => {
            if (!props.style) {
              props.style = {};
            }
            const topAnchor = props.style.top === "0";
            const rightAnchor = props.placement === "bottom-end";

            // offset top of select to place selected item under the cursor
            if (selectedValueIndex !== -1) {
              props.style.top = `-${offset + 32}px`;
            }

            return (
              <Positioner {...props}>
                <Background
                  dir="auto"
                  ref={contentRef}
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  style={
                    maxHeight && topAnchor
                      ? {
                          maxHeight,
                          minWidth,
                        }
                      : {
                          minWidth,
                        }
                  }
                >
                  {select.visible
                    ? options.map((option) => {
                        const isSelected =
                          select.selectedValue === option.value;
                        const Icon = isSelected ? CheckmarkIcon : Spacer;
                        return (
                          <StyledSelectOption
                            {...select}
                            value={option.value}
                            key={option.value}
                            ref={isSelected ? selectedRef : undefined}
                          >
                            <Icon />
                            &nbsp;
                            {option.label}
                          </StyledSelectOption>
                        );
                      })
                    : null}
                </Background>
              </Positioner>
            );
          }}
        </SelectPopover>
      </Wrapper>
      {note && (
        <Text type="secondary" size="small">
          {note}
        </Text>
      )}
      {select.visible && <Backdrop />}
    </>
  );
};

const Placeholder = styled.span`
  color: ${(props) => props.theme.placeholder};
`;

const Spacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledButton = styled(Button)<{ nude?: boolean }>`
  font-weight: normal;
  text-transform: none;
  margin-bottom: 16px;
  display: block;
  width: 100%;
  cursor: default;

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.buttonNeutralBackground};
  }

  ${(props) =>
    props.nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-left: 16px;
    padding-right: 8px;
  }

  svg {
    justify-self: flex-end;
    margin-left: auto;
  }
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}
  /* overriding the styles from MenuAnchorCSS because we use &nbsp; here */
  svg:not(:last-child) {
    margin-right: 0px;
  }
`;

const Wrapper = styled.label<{ short?: boolean }>`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

const Positioner = styled(Position)`
  &.focus-visible {
    ${StyledSelectOption} {
      &[aria-selected="true"] {
        color: ${(props) => props.theme.white};
        background: ${(props) => props.theme.primary};
        box-shadow: none;
        cursor: pointer;

        svg {
          fill: ${(props) => props.theme.white};
        }
      }
    }
  }
`;

export default InputSelect;
