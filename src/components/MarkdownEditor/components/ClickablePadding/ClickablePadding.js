import React from 'react';

const styles = {
  paddingTop: "100px",
  cursor: "text",
};

const ClickablePadding = (props) => {
  return (
    <div style={ styles } onClick={ props.onClick }>&nbsp;</div>
  )
};

ClickablePadding.propTypes = {
  onClick: React.PropTypes.func,
};

export default ClickablePadding;