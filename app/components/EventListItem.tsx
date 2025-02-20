import { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import {
  TrashIcon,
  ArchiveIcon,
  EditIcon,
  PublishIcon,
  MoveIcon,
  UnpublishIcon,
  RestoreIcon,
  UserIcon,
  CrossIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { s, hover } from "@shared/styles";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Document from "~/models/Document";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Item, { Actions } from "~/components/List/Item";
import Time from "~/components/Time";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import RevisionMenu from "~/menus/RevisionMenu";
import Logger from "~/utils/Logger";
import { documentHistoryPath } from "~/utils/routeHelpers";
import Text from "./Text";

export type RevisionEvent = {
  name: "revisions.create";
  latest: boolean;
};

export type DocumentEvent = {
  name:
    | "documents.publish"
    | "documents.unpublish"
    | "documents.archive"
    | "documents.unarchive"
    | "documents.delete"
    | "documents.restore"
    | "documents.add_user"
    | "documents.remove_user"
    | "documents.move";
  userId: string;
};

export type Event = { id: string; actorId: string; createdAt: string } & (
  | RevisionEvent
  | DocumentEvent
);

type Props = {
  document: Document;
  event: Event;
};

const EventListItem = ({ event, document, ...rest }: Props) => {
  const { t } = useTranslation();
  const { revisions, users } = useStores();
  const actor = "actorId" in event ? users.get(event.actorId) : undefined;
  const user = "userId" in event ? users.get(event.userId) : undefined;
  const location = useLocation();
  const sidebarContext = useLocationSidebarContext();
  const revisionLoadedRef = React.useRef(false);
  const opts = {
    userName: actor?.name,
  };
  const isRevision = event.name === "revisions.create";
  const isDerivedFromDocument =
    event.id === RevisionHelper.latestId(document.id);
  let meta, icon, to: LocationDescriptor | undefined;

  const ref = React.useRef<HTMLAnchorElement>(null);
  // the time component tends to steal focus when clicked
  // ...so forward the focus back to the parent item
  const handleTimeClick = () => {
    ref.current?.focus();
  };

  const prefetchRevision = async () => {
    if (
      !document.isDeleted &&
      event.name === "revisions.create" &&
      !isDerivedFromDocument &&
      !revisionLoadedRef.current
    ) {
      await revisions.fetch(event.id, { force: true });
      revisionLoadedRef.current = true;
    }
  };

  switch (event.name) {
    case "revisions.create":
      icon = <EditIcon size={16} />;
      meta = event.latest ? (
        <>
          {t("Current version")} &middot; {actor?.name}
        </>
      ) : (
        t("{{userName}} edited", opts)
      );
      to = {
        pathname: documentHistoryPath(
          document,
          isDerivedFromDocument ? "latest" : event.id
        ),
        state: {
          sidebarContext,
          retainScrollPosition: true,
        },
      };
      break;

    case "documents.archive":
      icon = <ArchiveIcon />;
      meta = t("{{userName}} archived", opts);
      break;

    case "documents.unarchive":
      icon = <RestoreIcon />;
      meta = t("{{userName}} restored", opts);
      break;

    case "documents.delete":
      icon = <TrashIcon />;
      meta = t("{{userName}} deleted", opts);
      break;
    case "documents.add_user":
      icon = <UserIcon />;
      meta = t("{{userName}} added {{addedUserName}}", {
        ...opts,
        addedUserName: user?.name ?? t("a user"),
      });
      break;
    case "documents.remove_user":
      icon = <CrossIcon />;
      meta = t("{{userName}} removed {{removedUserName}}", {
        ...opts,
        removedUserName: user?.name ?? t("a user"),
      });
      break;

    case "documents.restore":
      icon = <RestoreIcon />;
      meta = t("{{userName}} moved from trash", opts);
      break;

    case "documents.publish":
      icon = <PublishIcon />;
      meta = t("{{userName}} published", opts);
      break;

    case "documents.unpublish":
      icon = <UnpublishIcon />;
      meta = t("{{userName}} unpublished", opts);
      break;

    case "documents.move":
      icon = <MoveIcon />;
      meta = t("{{userName}} moved", opts);
      break;

    default:
      Logger.warn("Unhandled event", { event });
  }

  if (!meta) {
    return null;
  }

  const isActive =
    typeof to === "string"
      ? location.pathname === to
      : location.pathname === to?.pathname;

  if (document.isDeleted) {
    to = undefined;
  }

  return event.name === "revisions.create" ? (
    <RevisionItem
      small
      exact
      to={to}
      title={
        <Time
          dateTime={event.createdAt}
          format={{
            en_US: "MMM do, h:mm a",
            fr_FR: "'Le 'd MMMM 'à' H:mm",
          }}
          relative={false}
          addSuffix
          onClick={handleTimeClick}
        />
      }
      image={<Avatar model={actor} size={AvatarSize.Large} />}
      subtitle={meta}
      actions={
        isRevision && isActive && !event.latest ? (
          <StyledEventBoundary>
            <RevisionMenu document={document} revisionId={event.id} />
          </StyledEventBoundary>
        ) : undefined
      }
      onMouseEnter={prefetchRevision}
      ref={ref}
      {...rest}
    />
  ) : (
    <EventItem>
      <IconWrapper size="xsmall" type="secondary">
        {icon}
      </IconWrapper>
      <Text size="xsmall" type="secondary">
        {meta} &middot;{" "}
        <Time dateTime={event.createdAt} relative shorten addSuffix />
      </Text>
    </EventItem>
  );
};

const lineStyle = css`
  &::before {
    content: "";
    display: block;
    position: absolute;
    top: -8px;
    left: 22px;
    width: 1px;
    height: calc(50% - 14px + 8px);
    background: ${s("divider")};
    mix-blend-mode: multiply;
    z-index: 1;
  }

  &:first-child::before {
    display: none;
  }

  &:nth-child(2)::before {
    display: none;
  }

  &::after {
    content: "";
    display: block;
    position: absolute;
    top: calc(50% + 14px);
    left: 22px;
    width: 1px;
    height: calc(50% - 14px);
    background: ${s("divider")};
    mix-blend-mode: multiply;
    z-index: 1;
  }

  &:last-child::after {
    display: none;
  }

  h3 + &::before {
    display: none;
  }
`;

const IconWrapper = styled(Text)`
  height: 24px;
`;

const EventItem = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  list-style: none;
  margin: 8px 0;
  padding: 4px 10px;
  white-space: nowrap;
  position: relative;

  time {
    white-space: nowrap;
  }

  svg {
    flex-shrink: 0;
  }

  ${lineStyle}
`;

const StyledEventBoundary = styled(EventBoundary)`
  height: 24px;
`;

const RevisionItem = styled(Item)`
  border: 0;
  position: relative;
  margin: 8px 0;
  padding: 8px;
  border-radius: 8px;

  ${lineStyle}

  ${Actions} {
    opacity: 0.5;

    &: ${hover} {
      opacity: 1;
    }
  }
`;

export default observer(EventListItem);
