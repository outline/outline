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
import styled from "styled-components";
import Button, { Inner } from "components/Button";
import Flex from "components/Flex";
import { Position, Background, Backdrop } from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";
import useMenuHeight from "hooks/useMenuHeight";

export type Option = { label: string, value: string };

export type Props = {
  value?: string,
  label?: string,
  ariaLabelPlural: string,
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
    ariaLabelPlural,
    onChange,
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

  return (
    <Flex column>
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}
      </Wrapper>
      <Select {...select} aria-label={ariaLabel}>
        {(props) => {
          return (
            <StyledButton neutral disclosure className={className} {...props}>
              {getOptionFromValue(options, select.selectedValue).label ||
                `Select a ${ariaLabel}`}
            </StyledButton>
          );
        }}
      </Select>
      <SelectPopover {...select} {...popOver} aria-label={ariaLabelPlural}>
        {(props) => {
          const topAnchor = props.style.top === "0";
          const rightAnchor = props.placement === "bottom-end";

          return (
            <Position {...props}>
              <Background
                dir="auto"
                topAnchor={topAnchor}
                rightAnchor={rightAnchor}
                style={maxHeight && topAnchor ? { maxHeight } : undefined}
              >
                {select.visible || select.animating
                  ? options.map((option) => (
                      <Flex key={option.value}>
                        <StyledSelectOption {...select} value={option.value}>
                          {select.selectedValue && (
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
                      </Flex>
                    ))
                  : null}
              </Background>
            </Position>
          );
        }}
      </SelectPopover>
      {(select.visible || select.animating) && <Backdrop />}
    </Flex>
  );
};

const Spacer = styled.svg`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledButton = styled(Button)`
  text-transform: none;
  margin-bottom: 16px;
  width: fit-content;
  ${Inner} {
    line-height: 28px;
  }
`;

const Wrapper = styled.label`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}

  &[aria-selected="true"] {
    color: ${(props) => props.theme.white};
    background: ${(props) => props.theme.primary};
    box-shadow: none;
    cursor: pointer;

    svg {
      fill: ${(props) => props.theme.white};
    }
  }
`;

export default InputSelect;
