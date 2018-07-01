// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import breakpoint from 'styled-components-breakpoint';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { CollectionIcon, GoToIcon } from 'outline-icons';

import Document from 'models/Document';
import CollectionsStore from 'stores/CollectionsStore';
import { collectionUrl } from 'utils/routeHelpers';
import Flex from 'shared/components/Flex';

type Props = {
  document: Document,
  collections: CollectionsStore,
};

const Breadcrumb = observer(({ document, collections }: Props) => {
  const path = document.pathToDocument.slice(0, -1);
  const collection =
    collections.getById(document.collection.id) || document.collection;

  return (
    <Wrapper justify="flex-start" align="center">
      <CollectionName to={collectionUrl(collection.id)}>
        <CollectionIcon color={collection.color} expanded />{' '}
        <span>{collection.name}</span>
      </CollectionName>
      {path.map(n => (
        <React.Fragment>
          <Slash /> <Crumb to={n.url}>{n.title}</Crumb>
        </React.Fragment>
      ))}
    </Wrapper>
  );
});

const Wrapper = styled(Flex)`
  width: 33.3%;
  display: none;

  ${breakpoint('tablet')`	
    display: flex;
  `};
`;

const Slash = styled(GoToIcon)`
  flex-shrink: 0;
  opacity: 0.25;
`;

const Crumb = styled(Link)`
  color: ${props => props.theme.text};
  font-size: 15px;
  height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    text-decoration: underline;
  }
`;

const CollectionName = styled(Link)`
  display: flex;
  flex-shrink: 0;
  color: ${props => props.theme.text};
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
`;

export default inject('collections')(Breadcrumb);
