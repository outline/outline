// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import type { Props } from '../types';

export default class TodoItem extends Component {
  props: Props & { checked: boolean };

  handleChange = (ev: SyntheticInputEvent) => {
    const checked = ev.target.checked;
    const { editor, node } = this.props;
    const state = editor
      .getState()
      .transform()
      .setNodeByKey(node.key, { data: { checked } })
      .apply();

    editor.onChange(state);
  };

  render() {
    const { children, checked, readOnly } = this.props;

    return (
      <StyledLi contentEditable={false}>
        <input
          type="checkbox"
          checked={checked}
          onChange={this.handleChange}
          disabled={readOnly}
        />
        {' '}
        <span contentEditable={!readOnly} suppressContentEditableWarning>
          {children}
        </span>
      </StyledLi>
    );
  }
}

const StyledLi = styled.li`
  input {
    margin-right: 0.25em;
  }

  &:last-child:focus {
    outline: none;
  }
`;
