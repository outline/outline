// @flow
import { SearchIcon } from "outline-icons";
import * as React from "react";
import styled, { withTheme } from "styled-components";
import Flex from "components/Flex";
import { type Theme } from "types";

type Props = {
  onChange: (string) => void,
  defaultValue?: string,
  placeholder?: string,
  theme: Theme,
};

class SearchField extends React.Component<Props> {
  input: ?HTMLInputElement;

  componentDidMount() {
    if (this.props && this.input) {
      // ensure that focus is placed at end of input
      const len = (this.props.defaultValue || "").length;
      this.input.setSelectionRange(len, len);
    }
  }

  handleChange = (ev: SyntheticEvent<HTMLInputElement>) => {
    this.props.onChange(ev.currentTarget.value ? ev.currentTarget.value : "");
  };

  focusInput = (ev: SyntheticEvent<>) => {
    if (this.input) this.input.focus();
  };

  render() {
    return (
      <Field align="center">
        <StyledIcon
          type="Search"
          size={46}
          color={this.props.theme.textTertiary}
          onClick={this.focusInput}
        />
        <StyledInput
          {...this.props}
          ref={(ref) => (this.input = ref)}
          onChange={this.handleChange}
          spellCheck="false"
          placeholder={this.props.placeholder}
          type="search"
          autoFocus
        />
      </Field>
    );
  }
}

const Field = styled(Flex)`
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

export default withTheme(SearchField);
