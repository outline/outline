// @flow
import React, { Component } from 'react';
import SearchIcon from 'components/Icon/SearchIcon';
import Flex from 'components/Flex';
import { color } from 'styles/constants';
import styled from 'styled-components';

class SearchField extends Component {
  input: HTMLInputElement;
  props: {
    onChange: Function,
  };

  handleChange = (ev: SyntheticEvent) => {
    this.props.onChange(ev.currentTarget.value ? ev.currentTarget.value : '');
  };

  focusInput = (ev: SyntheticEvent) => {
    this.input.focus();
  };

  setRef = (ref: HTMLInputElement) => {
    this.input = ref;
  };

  render() {
    return (
      <Flex align="center">
        <StyledIcon
          type="Search"
          size={46}
          color={color.slateLight}
          onClick={this.focusInput}
        />
        <StyledInput
          {...this.props}
          innerRef={this.setRef}
          onChange={this.handleChange}
          spellCheck="false"
          placeholder="search…"
          autoFocus
        />
      </Flex>
    );
  }
}

const StyledInput = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 48px;
  font-weight: 400;
  outline: none;
  border: 0;

  ::-webkit-input-placeholder { color: ${color.slateLight}; }
  :-moz-placeholder { color: ${color.slateLight}; }
  ::-moz-placeholder { color: ${color.slateLight}; }
  :-ms-input-placeholder { color: ${color.slateLight}; }
`;

const StyledIcon = styled(SearchIcon)`
  position: relative;
  top: 6px;
`;

export default SearchField;
