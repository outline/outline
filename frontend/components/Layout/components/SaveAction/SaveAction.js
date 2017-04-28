import React from 'react';
import { observer } from 'mobx-react';

@observer class SaveAction extends React.Component {
  static propTypes = {
    onClick: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool,
    isNew: React.PropTypes.bool,
  };

  onClick = event => {
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
