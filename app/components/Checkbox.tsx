import * as React from "react";
import { ChangeEvent } from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import HelpText from "components/HelpText";

export type Props = {
  checked?: boolean;
  label?: React.ReactNode;
  labelHidden?: boolean;
  className?: string;
  name?: string;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => unknown;
  note?: string;
  short?: boolean;
  small?: boolean;
};

type LabelTextProps = { small: boolean };

const LabelText = styled.span<LabelTextProps>`
  font-weight: 500;
  margin-left: ${(props) => (props.small ? "6px" : "10px")};
  ${(props) => (props.small ? `color: ${props.theme.textSecondary}` : "")};
`;

type WrapperProps = { small: boolean };

const Wrapper = styled.div<WrapperProps>`
  padding-bottom: 8px;
  ${(props) => (props.small ? "font-size: 14px" : "")};
  width: 100%;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  user-select: none;
`;

export default function Checkbox({
  label,
  labelHidden,
  note,
  className,
  small,
  short,
  ...rest
}: Props) {
  const wrappedLabel = <LabelText small={small}>{label}</LabelText>;

  return (
    <>
      <Wrapper small={small}>
        <Label>
          <input type="checkbox" {...rest} />
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
