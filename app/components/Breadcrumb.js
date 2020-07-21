// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import breakpoint from "styled-components-breakpoint";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { PadlockIcon, GoToIcon, MoreIcon } from "outline-icons";

import Document from "models/Document";
import CollectionsStore from "stores/CollectionsStore";
import { collectionUrl } from "utils/routeHelpers";
import Flex from "components/Flex";
import BreadcrumbMenu from "./BreadcrumbMenu";
import CollectionIcon from "components/CollectionIcon";

type Props = {
  document: Document,
  collections: CollectionsStore,
  onlyText: boolean,
};

const Breadcrumb = observer(({ document, collections, onlyText }: Props) => {
  const collection = collections.get(document.collectionId);
  if (!collection) return <div />;

  const path = collection.pathToDocument(document).slice(0, -1);

  if (onlyText === true) {
    return (
      <React.Fragment>
        {collection.private && (
          <React.Fragment>
            <SmallPadlockIcon color="currentColor" size={16} />{" "}
          </React.Fragment>
        )}
        {collection.name}
        {path.map(n => (
          <React.Fragment key={n.id}>
            <SmallSlash />
            {n.title}
          </React.Fragment>
        ))}
      </React.Fragment>
    );
  }

  const isNestedDocument = path.length > 1;
  const lastPath = path.length ? path[path.length - 1] : undefined;
  const menuPath = isNestedDocument ? path.slice(0, -1) : [];

  return (
    <Wrapper justify="flex-start" align="center">
      <CollectionName to={collectionUrl(collection.id)}>
        <CollectionIcon collection={collection} expanded />&nbsp;
        <span>{collection.name}</span>
      </CollectionName>
      {isNestedDocument && (
        <React.Fragment>
          <Slash /> <BreadcrumbMenu label={<Overflow />} path={menuPath} />
        </React.Fragment>
      )}
      {lastPath && (
        <React.Fragment>
          <Slash />{" "}
          <Crumb to={lastPath.url} title={lastPath.title}>
            {lastPath.title}
          </Crumb>
        </React.Fragment>
      )}
    </Wrapper>
  );
});

const Wrapper = styled(Flex)`
  display: none;

  ${breakpoint("tablet")`	
    display: flex;
  `};
`;

const SmallPadlockIcon = styled(PadlockIcon)`
  display: inline-block;
  vertical-align: sub;
`;

const SmallSlash = styled(GoToIcon)`
  width: 15px;
  height: 10px;
  flex-shrink: 0;
  opacity: 0.25;
`;

export const Slash = styled(GoToIcon)`
  flex-shrink: 0;
  fill: ${props => props.theme.divider};
`;

const Overflow = styled(MoreIcon)`
  flex-shrink: 0;
  opacity: 0.25;
  transition: opacity 100ms ease-in-out;

  &:hover,
  &:active {
    opacity: 1;
  }
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

export default inject("collections")(Breadcrumb);
