// @flow
import React, { Component } from 'react';
import Icon from 'components/Icon';
import Flex from 'components/Flex';
import { color } from 'styles/constants';
import styled from 'styled-components';

const Field = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 48px;
  font-weight: 400;
  outline: none;
  border: 0;

  ::-webkit-input-placeholder { color: ${color.slate}; }
  :-moz-placeholder { color: ${color.slate}; }
  ::-moz-placeholder { color: ${color.slate}; }
  :-ms-input-placeholder { color: ${color.slate}; }
`;

class SearchField extends Component {
  input: HTMLElement;
  props: {
    onChange: Function,
  };

  handleChange = (ev: SyntheticEvent) => {
    this.props.onChange(ev.currentTarget.value ? ev.currentTarget.value : '');
  };

  focusInput = (ev: SyntheticEvent) => {
    this.input.focus();
  };

  setRef = (ref: HTMLElement) => {
    this.input = ref;
  };

  render() {
    return (
      <Flex align="center">
        <Icon
          type="Search"
          size={48}
          color="#C9CFD6"
          onClick={this.focusInput}
        />
        <Field
          {...this.props}
          innerRef={this.setRef}
          onChange={this.handleChange}
          placeholder="Search…"
          autoFocus
        />
      </Flex>
    );
  }
}

export default SearchField;
