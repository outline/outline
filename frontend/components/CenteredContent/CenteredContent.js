import React from 'react';

import styles from './CenteredContent.scss';

const CenteredContent = props => {
  const style = {
    maxWidth: props.maxWidth,
    ...props.style,
  };

  return (
    <div className={styles.content} style={style}>
      {props.children}
    </div>
  );
};

CenteredContent.defaultProps = {
  maxWidth: '740px',
};

CenteredContent.propTypes = {
  children: React.PropTypes.node.isRequired,
  style: React.PropTypes.object,
};

export default CenteredContent;
