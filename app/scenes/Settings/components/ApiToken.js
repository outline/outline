// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import Button from 'components/Button';

type Props = {
  id: string,
  name: ?string,
  secret: string,
  onDelete: (id: string) => *,
};

@observer
class ApiToken extends React.Component {
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
        <td>
          <code>{secret}</code>
        </td>
        <td align="right">
          <Button onClick={this.onClick} disabled={disabled} neutral>
            Revoke
          </Button>
        </td>
      </tr>
    );
  }
}

export default ApiToken;
