import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = React.ComponentProps<typeof OneTimePasswordRoot> & {
  /** The length of the OTP */
  length?: number;
};

export const OneTimePasswordInput = React.forwardRef(
  function OneTimePasswordInput_(
    { length = 6, ...rest }: Props,
    ref: React.RefObject<HTMLInputElement>
  ) {
    return (
      <OneTimePasswordRoot {...rest}>
        {Array.from({ length }, (_, i) => (
          <OneTimePasswordInputField key={i} />
        ))}
        <OneTimePasswordField.HiddenInput ref={ref} />
      </OneTimePasswordRoot>
    );
  }
);

const OneTimePasswordRoot = styled(OneTimePasswordField.Root)`
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  justify-content: space-between;
`;

const OneTimePasswordInputField = styled(OneTimePasswordField.Input)`
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 4px;
  font-size: 15px;
  color: ${s("text")};
  background: ${s("background")};
  box-shadow: 0 0 0 1px ${s("inputBorder")};
  padding: 0;
  height: 38px;
  width: 38px;
  line-height: 1;
  transition: box-shadow 0.1s ease-in-out;

  &:focus {
    box-shadow: 0 0 0 2px ${s("inputBorderFocused")};
  }
  &::selection {
    background-color: ${s("background")};
    color: ${s("text")};
  }
`;
