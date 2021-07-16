// @flow
import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";

import breakpoint from "styled-components-breakpoint";
import Button from "components/Button";
import Flex from "components/Flex";
import PaginatedEventList from "components/PaginatedEventList";
import Scrollable from "components/Scrollable";
import useStores from "hooks/useStores";
import { documentUrl } from "utils/routeHelpers";

function DocumentHistory() {
  const { events, documents } = useStores();
  const match = useRouteMatch();
  const history = useHistory();

  const document = documents.getByUrl(match.params.documentSlug);

  const onCloseHistory = () => {
    history.push(documentUrl(document));
  };

  if (!document) {
    return null;
  }

  return (
    <Sidebar>
      <Position column>
        <Header>
          <Title>History</Title>
          <Button
            icon={<CloseIcon />}
            onClick={onCloseHistory}
            borderOnHover
            neutral
          />
        </Header>
        <Scrollable topShadow>
          <PaginatedEventList
            fetch={events.fetchPage}
            events={events.inDocument(document.id)}
            options={{ documentId: document.id }}
            document={document}
          />
        </Scrollable>
      </Position>
    </Sidebar>
  );
}

const Position = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: ${(props) => props.theme.sidebarWidth}px;
`;

const Sidebar = styled(Flex)`
  display: none;
  background: ${(props) => props.theme.background};
  width: ${(props) => props.theme.sidebarWidth}px;
  border-left: 1px solid ${(props) => props.theme.divider};
  z-index: 1;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  align-items: center;
  position: relative;
  padding: 12px;
  color: ${(props) => props.theme.text};
  flex-shrink: 0;
`;

export default observer(DocumentHistory);
