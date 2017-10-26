// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { color } from 'styles/constants';

type Props = {
  id: string,
  name: ?string,
  secret: string,
  onDelete: Function,
};

@observer class ApiKeyRow extends React.Component {
  props: Props;
  @observable disabled: boolean;

  onClick = () => {
    this.props.onDelete(this.props.id);
    this.disabled = true;
  };

  render() {
    const { name, secret } = this.props;
    const { disabled } = this;

    return (
      <tr>
        <td>{name}</td>
        <td><code>{secret}</code></td>
        <td>
          <Action role="button" onClick={this.onClick} disabled={disabled}>
            Action
          </Action>
        </td>
      </tr>
    );
  }
}

const Action = styled.span`
  font-size: 14px;
  color: ${color.text};

  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

export default ApiKeyRow;
