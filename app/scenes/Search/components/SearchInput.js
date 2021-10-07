// @flow
import { SearchIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import Flex from "components/Flex";

type Props = {
  defaultValue?: string,
  placeholder?: string,
};

function SearchInput({ defaultValue, ...rest }: Props) {
  const theme = useTheme();
  const inputRef = React.useRef();

  React.useEffect(() => {
    // ensure that focus is placed at end of input
    const len = (defaultValue || "").length;
    inputRef.current?.setSelectionRange(len, len);
  }, [defaultValue]);

  const focusInput = React.useCallback((ev: SyntheticEvent<>) => {
    inputRef.current?.focus();
  }, []);

  return (
    <Wrapper align="center">
      <StyledIcon
        type="Search"
        size={46}
        color={theme.textTertiary}
        onClick={focusInput}
      />
      <StyledInput
        {...rest}
        defaultValue={defaultValue}
        ref={inputRef}
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
  font-size: 36px;
  font-weight: 400;
  outline: none;
  border: 0;
  background: ${(props) => props.theme.sidebarBackground};
  transition: ${(props) => props.theme.backgroundTransition};
  border-radius: 4px;

  color: ${(props) => props.theme.text};

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  ::-webkit-input-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  :-moz-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  ::-moz-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  :-ms-input-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  left: 8px;
`;

export default SearchInput;
