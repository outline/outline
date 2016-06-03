import React from 'react';
import { observer } from 'mobx-react';

@observer
class SaveAction extends React.Component {
  propTypes = {
    onClick: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool,
  }

  onClick = (event) => {
    if (this.props.disabled) return;

    event.preventDefault();
    this.props.onClick();
  }

  render() {
    return (
      <div>
        <a
          href
          onClick={ this.onClick }
          style={{ opacity: this.props.disabled ? 0.5 : 1 }}
        >Save</a>
      </div>
    );
  }
};

export default SaveAction;