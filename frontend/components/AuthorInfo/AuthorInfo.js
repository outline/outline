// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import type { User } from 'types';
import { Flex } from 'reflexbox';
import _ from 'lodash';

const Container = styled(Flex)`
  justify-content: space-between;
  color: #bbb;
  font-size: 13px;
`;

class AuthorInfo extends Component {
  props: {
    collaborators: Array<User>,
    views: number,
  };

  render() {
    const { collaborators, views } = this.props;

    const users = _.takeRight(collaborators, 5).map((user, index, arr) => (
      <span key={user.id}>
        {user.name} {arr.length > 1 && (index < arr.length - 1 ? ',' : 'and')}
      </span>
    ));

    return (
      <Container align="center">
        Recently edited by
        {' '}
        {users}
        {' '}
        and viewed
        {` ${views} `}
        times.
      </Container>
    );
  }
}

export default AuthorInfo;
