// @flow
import React from 'react';
import styles from './CenteredContent.scss';

type Props = {
  children: any,
  style: Object,
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
