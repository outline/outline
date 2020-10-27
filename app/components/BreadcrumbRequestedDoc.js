// @flow
import { observer, inject } from "mobx-react";
import { CollectionIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "components/Flex";
import AuthStore from "../stores/AuthStore";
import { collectionUrl } from "utils/routeHelpers";

type Props = {
  onlyText: boolean,
  auth: AuthStore,
};

const Breadcrumb = observer(({ requestedDoc, collections, auth, users, onlyText }: Props) => {

  let collection = collections.get(requestedDoc.collectionId);

  if (!collection) {
    return null;
  }

  const createdByMe = auth.user && auth.user.id === requestedDoc.userId;

  if (onlyText) {
    return (
      <Wrapper justify="flex-start" align="center" >
        <CollectionName to={collectionUrl(collection.id)}>
          <CollectionIcon color="currentColor" />
          &nbsp;
          <span>{collection.name}</span>
          &nbsp; | &nbsp;
        </CollectionName>

        {users.orderedData.map((user) => {
          if (user.id === requestedDoc.userId) {
            return <span key={user.id}> Requested by <b> {createdByMe ? "You" : user.name}</b> </span>;
          }
        })}


      </Wrapper>
    );
  }
});


const Wrapper = styled(Flex)`
  display: none;

  ${breakpoint("tablet")`   
    display: flex;
  `};
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

export default inject("collections", "auth", "users")(Breadcrumb);
