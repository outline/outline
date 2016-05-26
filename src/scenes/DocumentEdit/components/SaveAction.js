import React from 'react';
import { Arrow } from 'rebass';

class SaveAction extends React.Component {
  propTypes = {
    onClick: React.PropTypes.func.isRequired,
  }

  onClick = (event) => {
    event.preventDefault();
    this.props.onClick();
  }

  render() {
    return (
      <div>
        <a href onClick={ this.onClick }>Save</a>
      </div>
    );
  }
};

export default SaveAction;