import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import HelpText from "~/components/HelpText";

export type Props = {
  checked?: boolean;
  label?: React.ReactNode;
  labelHidden?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
  note?: React.ReactNode;
};

const LabelText = styled.span`
  font-weight: 500;
  margin-left: 10px;
`;

const Wrapper = styled.div`
  padding-bottom: 8px;
  width: 100%;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  user-select: none;
`;

const Toggle = styled.label`
  cursor: pointer;
  text-indent: -9999px;
  width: 26px;
  height: 14px;
  background: ${(props) => props.theme.slate};
  display: block;
  border-radius: 10px;
  position: relative;

  &:after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    background: ${(props) => props.theme.white};
    border-radius: 5px;
    transition: width 100ms ease-in-out;
  }

  &:active:after {
    width: 12px;
  }
`;

const HiddenInput = styled.input`
  height: 0;
  width: 0;
  visibility: hidden;

  &:checked + ${Toggle} {
    background: ${(props) => props.theme.primary};
  }

  &:checked + ${Toggle}:after {
    left: calc(100% - 2px);
    transform: translateX(-100%);
  }
`;

let inputId = 0;

export default function Checkbox({
  label,
  labelHidden,
  note,
  className,
  ...rest
}: Props) {
  const wrappedLabel = <LabelText>{label}</LabelText>;
  const [id] = React.useState(`checkbox-input-${inputId++}`);

  return (
    <>
      <Wrapper className={className}>
        <Label>
          <HiddenInput type="checkbox" id={id} {...rest} />
          <Toggle htmlFor={id} />
          {label &&
            (labelHidden ? (
              <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
            ) : (
              wrappedLabel
            ))}
        </Label>
        {note && <HelpText small>{note}</HelpText>}
      </Wrapper>
    </>
  );
}
