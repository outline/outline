// @flow
import React from 'react';
import styles from './CenteredContent.scss';

type Props = {
  children?: React.Element<any>,
  style?: Object,
  maxWidth?: string,
};

const CenteredContent = (props: Props) => {
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

export default CenteredContent;
