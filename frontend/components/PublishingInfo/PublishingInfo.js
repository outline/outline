import React, { PropTypes } from 'react';
import moment from 'moment';
import styled from 'styled-components';

import { Flex } from 'reflexbox';

import styles from './PublishingInfo.scss';

class PublishingInfo extends React.Component {
  static propTypes = {
    collaborators: PropTypes.array.isRequired,
    createdAt: PropTypes.string.isRequired,
    createdBy: PropTypes.object.isRequired,
    updatedAt: PropTypes.string.isRequired,
    updatedBy: PropTypes.object.isRequired,
  };

  render() {
    return (
      <Flex align="center" className={styles.user}>
        <Flex className={styles.avatarLine}>
          {this.props.collaborators
            .reverse()
            .map(user => (
              <Avatar
                key={`avatar-${user.id}`}
                src={user.avatarUrl}
                title={user.name}
              />
            ))}
        </Flex>
        <span className={styles.userName}>
          {this.props.createdBy.name}
          {' '}
          published
          {' '}
          {moment(this.props.createdAt).fromNow()}
          {this.props.createdAt !== this.props.updatedAt
            ? <span>
                &nbsp;and&nbsp;
                {this.props.createdBy.id !== this.props.updatedBy.id &&
                  ` ${this.props.updatedBy.name} `}
                modified {moment(this.props.updatedAt).fromNow()}
              </span>
            : null}
        </span>
      </Flex>
    );
  }
}

const Avatar = styled.img`
  width: 26px;
  height: 26px;
  marginRight: '-12px',

  border-radius: 50%;
  border: '2px solid #FFFFFF';
`;

export default PublishingInfo;
