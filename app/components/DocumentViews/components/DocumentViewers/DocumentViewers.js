// @flow
import React, { Component } from 'react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';
import map from 'lodash/map';
import Avatar from 'components/Avatar';
import Scrollable from 'components/Scrollable';

type Props = {
  viewers: Array<Object>,
  onMount: Function,
};

const List = styled.ul`
  list-style: none;
  font-size: 13px;
  margin: -4px 0;
  padding: 0;

  li {
    padding: 4px 0;
  }
`;

const UserName = styled.span`
  padding-left: 8px;
`;

class DocumentViewers extends Component {
  props: Props;

  componentDidMount() {
    this.props.onMount();
  }

  render() {
    return (
      <Scrollable>
        <List>
          {map(this.props.viewers, view => (
            <li key={view.user.id}>
              <Flex align="center">
                <Avatar src={view.user.avatarUrl} />
                {' '}
                <UserName>{view.user.name}</UserName>
              </Flex>
            </li>
          ))}
        </List>
      </Scrollable>
    );
  }
}

export default DocumentViewers;
