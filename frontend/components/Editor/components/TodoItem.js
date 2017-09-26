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
      <ListItem>
        <Input
          type="checkbox"
          checked={checked}
          onChange={this.handleChange}
          disabled={readOnly}
        />
        {children}
      </ListItem>
    );
  }
}

const ListItem = styled.li`
  padding-left: 1.4em;
  position: relative;
`;

const Input = styled.input`
  position: absolute;
  left: 0;
  top: 0.4em;
`;
