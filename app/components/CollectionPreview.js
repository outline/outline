// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Collection from "models/Collection";
import CollectionIcon from "components/CollectionIcon";
import Flex from "components/Flex";
import Highlight from "components/Highlight";
import CollectionMenu from "menus/CollectionMenu";

type Props = {
  collection: Collection,
  highlight?: ?string,
};

function CollectionPreview(props: Props) {
  const { collection, highlight } = props;

  return (
    <CollectionLink to={collection.url}>
      <Heading>
        <IconWrapper>
          <CollectionIcon collection={collection} />
        </IconWrapper>
        <Title text={collection.name} highlight={highlight} />
        <SecondaryActions>
          <CollectionMenu collection={collection} position="right" />
        </SecondaryActions>
      </Heading>
    </CollectionLink>
  );
}

const SecondaryActions = styled.div`
  margin-right: 8px;
`;

const CollectionLink = styled(Link)`
  display: flex;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  ${SecondaryActions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};

    ${SecondaryActions} {
      opacity: 1;
    }
  }
`;

const Heading = styled.h3`
  display: flex;
  flex-grow: 1;
  align-items: center;
  height: 30px;
  margin: 0;
  overflow: hidden;
  white-space: nowrap;
  color: ${(props) => props.theme.text};
`;

const Title = styled(Highlight)`
  overflow: hidden;
  flex-grow: 1;
  text-overflow: ellipsis;
`;

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

export default CollectionPreview;
