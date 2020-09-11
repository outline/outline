// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import Collection from "models/Collection";
import CollectionIcon from "components/CollectionIcon";
import Flex from "components/Flex";
import Highlight from "components/Highlight";
import CollectionMenu from "menus/CollectionMenu";

type Props = {
  collection: Collection,
  highlight?: ?string,
};

class CollectionPreview extends React.Component<Props> {
  render() {
    const { collection, highlight } = this.props;

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
}

const SecondaryActions = styled(Flex)`
  align-items: center;
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
`;

const CollectionLink = styled(Link)`
  display: flex;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  min-width: 100%;
  max-width: calc(100vw - 40px);
  overflow: hidden;
  position: relative;

  ${SecondaryActions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus {
    background: ${(props) => props.theme.listItemHoverBackground};
    outline: none;

    ${SecondaryActions} {
      opacity: 1;
    }
  }
`;

const Heading = styled.h3`
  display: flex;
  align-items: center;
  height: 24px;
  margin-top: 0;
  margin-bottom: 0.25em;
  overflow: hidden;
  white-space: nowrap;
  color: ${(props) => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

const Title = styled(Highlight)`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

export default withTheme(CollectionPreview);
