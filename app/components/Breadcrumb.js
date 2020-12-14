// @flow
import { observer } from "mobx-react";
import {
  ArchiveIcon,
  EditIcon,
  GoToIcon,
  MoreIcon,
  PadlockIcon,
  ShapesIcon,
  TrashIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

import CollectionsStore from "stores/CollectionsStore";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import Flex from "components/Flex";
import BreadcrumbMenu from "./BreadcrumbMenu";
import useStores from "hooks/useStores";
import { collectionUrl } from "utils/routeHelpers";

type Props = {
  document: Document,
  collections: CollectionsStore,
  onlyText: boolean,
};

function Icon({ document }) {
  const { t } = useTranslation();

  if (document.isDeleted) {
    return (
      <>
        <CollectionName to="/trash">
          <TrashIcon color="currentColor" />
          &nbsp;
          <span>{t("Trash")}</span>
        </CollectionName>
        <Slash />
      </>
    );
  }
  if (document.isArchived) {
    return (
      <>
        <CollectionName to="/archive">
          <ArchiveIcon color="currentColor" />
          &nbsp;
          <span>{t("Archive")}</span>
        </CollectionName>
        <Slash />
      </>
    );
  }
  if (document.isDraft) {
    return (
      <>
        <CollectionName to="/drafts">
          <EditIcon color="currentColor" />
          &nbsp;
          <span>{t("Drafts")}</span>
        </CollectionName>
        <Slash />
      </>
    );
  }
  if (document.isTemplate) {
    return (
      <>
        <CollectionName to="/templates">
          <ShapesIcon color="currentColor" />
          &nbsp;
          <span>{t("Templates")}</span>
        </CollectionName>
        <Slash />
      </>
    );
  }
  return null;
}

const Breadcrumb = ({ document, onlyText }: Props) => {
  const { collections } = useStores();
  const { t } = useTranslation();

  let collection = collections.get(document.collectionId);
  if (!collection) {
    if (!document.deletedAt) return <div />;

    collection = {
      id: document.collectionId,
      name: t("Deleted Collection"),
      color: "currentColor",
    };
  }

  const path = collection.pathToDocument
    ? collection.pathToDocument(document.id).slice(0, -1)
    : [];

  if (onlyText === true) {
    return (
      <>
        {collection.private && (
          <>
            <SmallPadlockIcon color="currentColor" size={16} />{" "}
          </>
        )}
        {collection.name}
        {path.map((n) => (
          <React.Fragment key={n.id}>
            <SmallSlash />
            {n.title}
          </React.Fragment>
        ))}
      </>
    );
  }

  const isNestedDocument = path.length > 1;
  const lastPath = path.length ? path[path.length - 1] : undefined;
  const menuPath = isNestedDocument ? path.slice(0, -1) : [];

  return (
    <Wrapper justify="flex-start" align="center">
      <Icon document={document} />
      <CollectionName to={collectionUrl(collection.id)}>
        <CollectionIcon collection={collection} expanded />
        &nbsp;
        <span>{collection.name}</span>
      </CollectionName>
      {isNestedDocument && (
        <>
          <Slash /> <BreadcrumbMenu label={<Overflow />} path={menuPath} />
        </>
      )}
      {lastPath && (
        <>
          <Slash />{" "}
          <Crumb to={lastPath.url} title={lastPath.title}>
            {lastPath.title}
          </Crumb>
        </>
      )}
    </Wrapper>
  );
};

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
  fill: ${(props) => props.theme.divider};
`;

const Overflow = styled(MoreIcon)`
  flex-shrink: 0;
  transition: opacity 100ms ease-in-out;
  fill: ${(props) => props.theme.divider};

  &:active,
  &:hover {
    fill: ${(props) => props.theme.text};
  }
`;

const Crumb = styled(Link)`
  color: ${(props) => props.theme.text};
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
  color: ${(props) => props.theme.text};
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
`;

export default observer(Breadcrumb);
