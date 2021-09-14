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
import { LabelText } from "./Input";
import {
  fadeAndSlideUp,
  fadeAndSlideDown,
  mobileContextMenu,
} from "styles/animations";

const SelectStyle = styled(Select)`
  border: 0;
  flex: 1;
  padding: 4px 0;
  outline: none;
  background: none;
  color: ${(props) => props.theme.text};
  height: 30px;
  font-size: 14px;

  option {
    background: ${(props) => props.theme.buttonNeutralBackground};
  }

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }

  ${breakpoint("mobile", "tablet")`
    font-size: 16px;
  `};
`;

const Wrapper = styled.label`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

export type Option = { label: string, value: string };

export type Props = {
  value?: string,
  label?: string,
  short?: boolean,
  className?: string,
  labelHidden?: boolean,
  options: Option[],
  onBlur?: () => void,
  onFocus?: () => void,
};

const SelectInput = (props: Props) => {
  const select = useSelectState({
    gutter: 2,
    placement: "bottom-start",
  });

  const { label, className, labelHidden, options, short } = props;

  const wrappedLabel = <LabelText>{label}</LabelText>;
  console.log(select);
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
      <SelectStyle {...select} aria-label="hi">
        <Flex>
          <StyledButton className={className} neutral disclosure small>
            {select.selectedValue || "Select a Person"}
          </StyledButton>
        </Flex>
      </SelectStyle>
      <Background {...select} aria-label="his">
        {options.map((option) => (
          <SelectOption {...select} value={option.label}>
            <Flex>{option.label}</Flex>
          </SelectOption>
        ))}
      </Background>
    </Flex>
  );
};

const Background = styled(SelectPopover)`
  animation: ${mobileContextMenu} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${(props) => props.theme.menuBackground};
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
    animation: ${(props) =>
      props.topAnchor ? fadeAndSlideDown : fadeAndSlideUp} 200ms ease;
    transform-origin: ${(props) =>
      props.rightAnchor === "bottom-end" ? "75%" : "25%"} 0;
    max-width: 276px;
    background: ${(props) => props.theme.menuBackground};
    box-shadow: ${(props) => props.theme.menuShadow};
    border: ${(props) =>
      props.theme.menuBorder ? `1px solid ${props.theme.menuBorder}` : "none"};
  `};
`;

const StyledButton = styled(Button)`
  text-transform: none;

  ${Inner} {
    line-height: 28px;
  }
`;

export const MenuAnchor = styled.li`
  display: flex;
  margin: 0;
  border: 0;
  padding: 12px;
  width: 100%;
  min-height: 32px;
  background: none;
  color: ${(props) =>
    props.disabled ? props.theme.textTertiary : props.theme.textSecondary};
  justify-content: left;
  align-items: center;
  font-size: 16px;
  cursor: default;
  user-select: none;

  svg:not(:last-child) {
    margin-right: 4px;
  }

  svg {
    flex-shrink: 0;
    opacity: ${(props) => (props.disabled ? ".5" : 1)};
  }

  ${(props) =>
    props.disabled
      ? "pointer-events: none;"
      : `

  &:hover,  
  &:focus,
  &.focus-visible {
    color: ${props.theme.white};
    background: ${props.theme.primary};
    box-shadow: none;
    cursor: pointer;

    svg {
      fill: ${props.theme.white};
    }
  }
  `};

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `};
`;

export default SelectInput;
