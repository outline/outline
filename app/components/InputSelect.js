// @flow
import {
  Select,
  SelectOption,
  useSelectState,
  useSelectPopover,
  SelectPopover,
} from "@renderlesskit/react";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import Button, { Inner } from "components/Button";
import Flex from "components/Flex";
import { Position, Background, Backdrop } from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";

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

const getOptionFromLabel = (options: Option[], label) => {
  return options.find((option) => option.label === label) || {};
};

const getOptionFromValue = (options: Option[], value) => {
  return options.find((option) => option.value === value) || {};
};

const InputSelect = (props: Props) => {
  const select = useSelectState({
    gutter: 0,
    modal: true,
  });

  const popOver = useSelectPopover({
    ...select,
    hideOnClickOutside: true,
    preventBodyScroll: true,
  });

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

  const handleOnClick = async (ev: SyntheticEvent<*>) => {
    const { target } = ev;

    if (!(target instanceof HTMLDivElement)) return;

    await onChange(getOptionFromLabel(options, target.innerText).value);
  };

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
              <span>
                {select.selectedValue ||
                  getOptionFromValue(options, value).label ||
                  `Select a ${ariaLabel}`}
              </span>
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
              >
                {select.visible || select.animating
                  ? options.map((option) => (
                      <div key={option.value}>
                        <StyledSelectOption
                          {...select}
                          value={option.label}
                          key={option.value}
                          onClick={handleOnClick}
                        >
                          {option.label}
                        </StyledSelectOption>
                      </div>
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
`;

export default InputSelect;
