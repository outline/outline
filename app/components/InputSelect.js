// @flow
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
import styled, { css } from "styled-components";
import Button, { Inner } from "components/Button";
import { Position, Background, Backdrop } from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";
import useMenuHeight from "hooks/useMenuHeight";

export type Option = { label: string, value: string };

export type Props = {
  value?: string,
  label?: string,
  nude?: boolean,
  ariaLabel: string,
  short?: boolean,
  className?: string,
  labelHidden?: boolean,
  options: Option[],
  onChange: (string) => Promise<void> | void,
};

const getOptionFromValue = (options: Option[], value) => {
  return options.find((option) => option.value === value) || {};
};

const InputSelect = (props: Props) => {
  const {
    value,
    label,
    className,
    labelHidden,
    options,
    short,
    ariaLabel,
    onChange,
    nude,
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
  });

  const previousValue = React.useRef(value);
  const buttonRef = React.useRef();
  const minWidth = buttonRef.current?.offsetWidth || 0;

  const maxHeight = useMenuHeight(
    select.visible,
    select.unstable_disclosureRef
  );

  React.useEffect(() => {
    if (previousValue.current === select.selectedValue) return;

    previousValue.current = select.selectedValue;
    async function load() {
      await onChange(select.selectedValue);
    }
    load();
  }, [onChange, select.selectedValue]);

  const wrappedLabel = <LabelText>{label}</LabelText>;

  const selectedValueIndex = options.findIndex(
    (option) => option.value === select.selectedValue
  );

  return (
    <>
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}
        <Select {...select} aria-label={ariaLabel} ref={buttonRef}>
          {(props) => (
            <StyledButton
              neutral
              disclosure
              className={className}
              nude={nude}
              {...props}
            >
              {getOptionFromValue(options, select.selectedValue).label ||
                `Select a ${ariaLabel}`}
            </StyledButton>
          )}
        </Select>
        <SelectPopover {...select} {...popOver}>
          {(props) => {
            const topAnchor = props.style.top === "0";
            const rightAnchor = props.placement === "bottom-end";

            // offset top of select to place selected item under the cursor
            if (selectedValueIndex !== -1) {
              props.style.top = `-${(selectedValueIndex + 1) * 32}px`;
            }

            return (
              <Positioner {...props}>
                <Background
                  dir="auto"
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  style={
                    maxHeight && topAnchor
                      ? { maxHeight, minWidth }
                      : { minWidth }
                  }
                >
                  {select.visible || select.animating
                    ? options.map((option) => (
                        <StyledSelectOption
                          {...select}
                          value={option.value}
                          key={option.value}
                        >
                          {select.selectedValue !== undefined && (
                            <>
                              {select.selectedValue === option.value ? (
                                <CheckmarkIcon color="currentColor" />
                              ) : (
                                <Spacer />
                              )}
                              &nbsp;
                            </>
                          )}
                          {option.label}
                        </StyledSelectOption>
                      ))
                    : null}
                </Background>
              </Positioner>
            );
          }}
        </SelectPopover>
      </Wrapper>
      {(select.visible || select.animating) && <Backdrop />}
    </>
  );
};

const Spacer = styled.svg`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledButton = styled(Button)`
  font-weight: normal;
  text-transform: none;
  margin-bottom: 16px;
  display: block;
  width: 100%;

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
    justify-content: space-between;
  }
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}
`;

const Wrapper = styled.label`
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
