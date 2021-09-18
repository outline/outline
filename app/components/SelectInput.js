// @flow
import {
  Select,
  SelectOption,
  SelectPopover,
  useSelectState,
} from "@renderlesskit/react";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button, { Inner } from "components/Button";
import Flex from "components/Flex";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";

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

const SelectInput = (props: Props) => {
  const select = useSelectState({
    gutter: 2,
    placement: "bottom-start",
    current: getOptionFromValue(props.options, props.value).label,
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

    await onChange(getOptionFromLabel(options, target.innerText).value || "");
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
      <Container {...select} aria-label={ariaLabelPlural}>
        {options.map((option) => (
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
        ))}
      </Container>
    </Flex>
  );
};

const Container = styled(SelectPopover)`
  max-width: 100%;
  background: ${(props) => props.theme.menuBackground};
  box-shadow: ${(props) => props.theme.menuShadow};
  border-radius: 6px;
  padding: 6px 0;
  min-width: 180px;
  overflow: hidden;
  overflow-y: auto;
  max-height: 75vh;
  pointer-events: all;
  font-weight: normal;
  z-index: ${(props) => props.theme.depths.modal};

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    max-width: 276px;
    border: ${(props) =>
      props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  `};
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}
`;

export default SelectInput;
