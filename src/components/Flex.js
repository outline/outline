import React from 'react';

const Flex = (props) => {
  const style = {
    display: 'flex',
    flex: props.flex ? '1' : null,
    flexDirection: props.direction,
    justifyContent: props.justify,
    alignItems: props.align,
  };

  return (
    <div style={ style } {...props}>
      { props.children }
    </div>
  );
};

Flex.defaultProps = {
  direction: 'row',
  justify: null,
  align: null,
  flex: null,
};

Flex.propTypes = {
  children: React.PropTypes.node.isRequired,
  direction: React.PropTypes.string,
  justify: React.PropTypes.string,
  align: React.PropTypes.string,
  flex: React.PropTypes.bool,
};

export default Flex;