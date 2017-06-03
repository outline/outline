// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';
import map from 'lodash/map';
import Avatar from 'components/Avatar';
import DocumentViewersStore from './DocumentViewersStore';

type Props = {
  documentId: string,
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

@observer class DocumentViewers extends Component {
  store: DocumentViewersStore;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.store = new DocumentViewersStore(props.documentId);
  }

  componentDidMount() {
    this.store.fetchViews();
  }

  render() {
    return (
      <List>
        {map(this.store.viewers, view => (
          <li key={view.user.id}>
            <Flex align="center">
              <Avatar src={view.user.avatarUrl} />
              {' '}
              <UserName>{view.user.name}</UserName>
            </Flex>
          </li>
        ))}
      </List>
    );
  }
}

export default DocumentViewers;
