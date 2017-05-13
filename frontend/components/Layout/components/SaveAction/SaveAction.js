// @flow
import React from 'react';
import { observer } from 'mobx-react';

type Props = {
  onClick: Function,
  disabled?: boolean,
  isNew?: boolean,
};

@observer class SaveAction extends React.Component {
  props: Props;

  onClick = (event: MouseEvent) => {
    if (this.props.disabled) return;

    event.preventDefault();
    this.props.onClick();
  };

  render() {
    const { disabled, isNew } = this.props;

    return (
      <div>
        <a
          href
          onClick={this.onClick}
          style={{ opacity: disabled ? 0.5 : 1 }}
          title="Save changes (Cmd+Enter)"
        >
          {isNew ? 'Publish' : 'Save'}
        </a>
      </div>
    );
  }
}

export default SaveAction;
