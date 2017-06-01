// @flow
import React, { Component } from 'react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';
import searchImg from 'assets/icons/search.svg';

const Field = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 48px;
  font-weight: 400;
  outline: none;
  border: 0;

  ::-webkit-input-placeholder { color: #ccc; }
  :-moz-placeholder { color: #ccc; }
  ::-moz-placeholder { color: #ccc; }
  :-ms-input-placeholder { color: #ccc; }
`;

const Icon = styled.img`
  width: 38px;
  margin-bottom: -5px;
  margin-right: 10px;
  opacity: 0.15;
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
      <Flex>
        <Icon src={searchImg} alt="Search" onClick={this.focusInput} />
        <Field
          {...this.props}
          innerRef={this.setRef}
          onChange={this.handleChange}
          placeholder="Search"
          autoFocus
        />
      </Flex>
    );
  }
}

export default SearchField;
