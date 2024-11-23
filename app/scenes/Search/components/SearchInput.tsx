import { SearchIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

interface Props extends React.HTMLAttributes<HTMLInputElement> {
  name: string;
  defaultValue: string;
}

function SearchInput(
  { defaultValue, ...rest }: Props,
  ref: React.RefObject<HTMLInputElement>
) {
  const theme = useTheme();
  const focusInput = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  React.useEffect(() => {
    // ensure that focus is placed at end of input
    const len = (defaultValue || "").length;
    ref.current?.setSelectionRange(len, len);
    const timeoutId = setTimeout(() => {
      focusInput();
    }, 100); // arbitrary number

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ref, defaultValue, focusInput]);

  return (
    <Wrapper align="center">
      <StyledIcon size={46} color={theme.placeholder} onClick={focusInput} />
      <StyledInput
        {...rest}
        defaultValue={defaultValue}
        ref={ref}
        spellCheck="false"
        type="search"
        autoFocus
      />
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  position: relative;
  margin-bottom: 8px;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 10px 10px 60px;
  font-size: 30px;
  font-weight: 400;
  outline: none;
  border: 0;
  background: ${s("sidebarBackground")};
  border-radius: 4px;

  color: ${s("text")};

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  ::-webkit-input-placeholder {
    color: ${s("placeholder")};
  }
  :-moz-placeholder {
    color: ${s("placeholder")};
  }
  ::-moz-placeholder {
    color: ${s("placeholder")};
  }
  :-ms-input-placeholder {
    color: ${s("placeholder")};
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  left: 8px;
  opacity: 0.7;
`;

export default React.forwardRef(SearchInput);
