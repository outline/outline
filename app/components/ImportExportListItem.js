// @flow
import { LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Export from "models/Export";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Button from "components/Button";
import EventBoundary from "components/EventBoundary";
import Flex from "components/Flex";
import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import useMobile from "hooks/useMobile";
import useQuery from "hooks/useQuery";

type ImportExportListItemProps = {
  item: Export,
};

const ImportExportListItem = ({ item }: ImportExportListItemProps) => {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const isMobile = useMobile();
  const params = useQuery();
  const key = params.get("key") || "";

  return (
    <ImportExportListItemWrapper highlight={key === item.id}>
      <Flex align="center" column>
        <AvatarWrapper src={item.user.avatarUrl} size={32} />
      </Flex>
      <Content>
        <Heading>
          {item.collection ? (
            <Title>
              <Link to={item.collection.url}>{item.collection.name}</Link>
            </Title>
          ) : (
            <Title>All collections</Title>
          )}
          <Badge>{item.state}</Badge>
        </Heading>
        <Container>
          <Flex>
            {user.id === item.user.id ? t("You") : item.user.name} created&nbsp;
            <Time dateTime={item.createdAt} addSuffix shorten />
          </Flex>
          {!isMobile && <>&nbsp;•&nbsp;</>}
          <Flex>{(item.size / (1024 * 1024)).toPrecision(2)}MB</Flex>
        </Container>
      </Content>

      {item.url && (
        <Actions>
          <Button
            onClick={() => window.open(item.url, "_blank")}
            icon={<LinkIcon fill="currentColor" />}
            neutral
          >
            {t("View")}
          </Button>
        </Actions>
      )}
    </ImportExportListItemWrapper>
  );
};

const Actions = styled(EventBoundary)`
  align-items: center;
  margin: 8px;
  flex-shrink: 0;
  flex-grow: 0;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Content = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  width: 100%;
  min-width: 0;
  margin-left: 0.5em;
`;

const Container = styled(Flex)`
  justify-content: "flex-start";
  color: ${(props) => props.theme.textTertiary};
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;

  ${breakpoint("mobile", "tablet")`
    flex-direction: column;
  `};
`;

const ImportExportListItemWrapper = styled(Flex)`
  align-items: center;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: 8px;
  max-height: 50vh;
  width: calc(100vw - 8px);
  background: ${(props) =>
    props.highlight ? props.theme.sidebarBackground : ""};

  ${breakpoint("tablet")`
    width: auto;
  `};

  &:hover,
  &:active,
  &:focus,
  &:focus-within {
    background: ${(props) => props.theme.listItemHoverBackground};
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${(props) => props.theme.listItemHoverBackground};
    `}
`;

const AvatarWrapper = styled(Avatar)`
  display: none;
  ${breakpoint("desktop")`
    display: inherit;
  `};
`;

const Title = styled.span`
  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
`;

const Heading = styled.p`
  font-size: ${(props) => (props.$small ? 14 : 16)}px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: ${(props) => (props.$small ? 1.3 : 1.2)};
  margin: 0;
  height: 24px;
  margin-bottom: 0.25em;
  color: ${(props) => props.theme.text};
`;

export default ImportExportListItem;
