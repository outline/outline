import { SearchIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import Input, { NativeInput, Outline } from "~/components/Input";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  defaultValue: string;
  ref: React.RefObject<HTMLInputElement | null>;
}

function SearchInput({ defaultValue, ref, ...rest }: Props) {
  React.useEffect(() => {
    // ensure that focus is placed at end of input
    const len = (defaultValue || "").length;
    ref.current?.setSelectionRange(len, len);
    const timeoutId = setTimeout(() => {
      ref.current?.focus();
    }, 100); // arbitrary number

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ref, defaultValue]);

  return (
    <StyledInput
      {...rest}
      type="search"
      icon={<StyledSearchIcon />}
      defaultValue={defaultValue}
      ref={ref}
      spellCheck="false"
      margin="0 0 12px"
      autoFocus
    />
  );
}

const StyledInput = styled(Input)`
  ${Outline} {
    border-color: transparent;
    border-radius: 10px;
    background: ${s("backgroundSecondary")};
    transition:
      background 100ms ease-out,
      border-color 100ms ease-out;
  }

  &:focus-within ${Outline} {
    border-color: ${s("inputBorderFocused")};
    background: ${s("background")};
  }

  ${NativeInput} {
    height: 46px;
    font-size: 17px;
  }
`;

const StyledSearchIcon = styled(SearchIcon)`
  margin-inline-start: 4px;
  color: ${s("textTertiary")};
`;

export default SearchInput;
