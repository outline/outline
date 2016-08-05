import React from 'react';
import moment from 'moment';

import { Avatar } from 'rebass';
import { Flex } from 'reflexbox';

import styles from './PublishingInfo.scss';

const PublishingInfo = (props) => {
  return (
    <Flex align="center" className={ styles.user }>
      <Avatar src={ props.avatarUrl } size={ 24 } />
      <span className={ styles.userName }>
        { props.name } published { moment(props.createdAt).fromNow() }
        { props.createdAt !== props.updatedAt ? (
          <span>
            &nbsp;and modified { moment(props.updatedAt).fromNow() }
          </span>
        ) : null }
      </span>
    </Flex>
  );
};

PublishingInfo.propTypes = {
  avatarUrl: React.PropTypes.string.isRequired,
  name: React.PropTypes.string.isRequired,
  createdAt: React.PropTypes.string.isRequired,
  updatedAt: React.PropTypes.string.isRequired,
};

export default PublishingInfo;
