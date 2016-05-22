import React from 'react';
import moment from 'moment';

import { Avatar } from 'rebass';
import Flex from 'components/Flex';

import styles from './Document.scss';

const Document = (props) => {
  return (
    <div className={ styles.container }>
      <Flex align="center" className={ styles.user }>
        <Avatar src={ props.document.user.avatarUrl } size={ 24 } />
        <span className={ styles.userName }>
          { props.document.user.name } published { moment(document.createdAt).fromNow() }
        </span>
      </Flex>

      <div dangerouslySetInnerHTML={{ __html: props.document.html }} />
    </div>
  );
};

export default Document;
