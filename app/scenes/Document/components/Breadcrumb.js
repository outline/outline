// @flow
import * as React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { CollectionIcon, GoToIcon } from 'outline-icons';

import { collectionUrl } from 'utils/routeHelpers';
import Flex from 'shared/components/Flex';
import Document from 'models/Document';

type Props = {
  document: Document,
};

const Breadcrumb = ({ document }: Props) => {
  const path = document.pathToDocument.slice(0, -1);

  return (
    <Wrapper justify="flex-start" align="center">
      <CollectionName to={collectionUrl(document.collectionId)}>
        <CollectionIcon color={document.collection.color} />{' '}
        <span>{document.collection.name}</span>
      </CollectionName>
      {path.map(n => (
        <React.Fragment>
          <Slash /> <Crumb to={n.url}>{n.title}</Crumb>
        </React.Fragment>
      ))}
    </Wrapper>
  );
};

const Wrapper = styled(Flex)`
  width: 33.3%;
`;

const Slash = styled(GoToIcon)`
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
  color: ${props => props.theme.text};
  font-size: 15px;
  display: flex;
  font-weight: 500;
`;

export default Breadcrumb;
