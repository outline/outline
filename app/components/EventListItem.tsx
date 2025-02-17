import { LocationDescriptor } from "history";
import { observer } from "mobx-react";
import {
  TrashIcon,
  ArchiveIcon,
  EditIcon,
  PublishIcon,
  MoveIcon,
  UnpublishIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled, { css } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { s, hover } from "@shared/styles";
import { RevisionHelper } from "@shared/utils/RevisionHelper";
import Document from "~/models/Document";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Item, { Actions, Props as ItemProps } from "~/components/List/Item";
import Time from "~/components/Time";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import RevisionMenu from "~/menus/RevisionMenu";
import Logger from "~/utils/Logger";
import { documentHistoryPath } from "~/utils/routeHelpers";

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
  user?: User;
};

export type Event = { id: string; actor: User; createdAt: string } & (
  | RevisionEvent
  | DocumentEvent
);

type Props = {
  document: Document;
  event: Event;
};

const EventListItem = ({ event, document, ...rest }: Props) => {
  const { t } = useTranslation();
  const { revisions } = useStores();
  const location = useLocation();
  const sidebarContext = useLocationSidebarContext();
  const revisionLoadedRef = React.useRef(false);
  const opts = {
    userName: event.actor.name,
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
          {t("Current version")} &middot; {event.actor.name}
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
      icon = <ArchiveIcon size={16} />;
      meta = t("{{userName}} archived", opts);
      break;

    case "documents.unarchive":
      meta = t("{{userName}} restored", opts);
      break;

    case "documents.delete":
      icon = <TrashIcon size={16} />;
      meta = t("{{userName}} deleted", opts);
      break;
    case "documents.add_user":
      meta = t("{{userName}} added {{addedUserName}}", {
        ...opts,
        addedUserName: event.user?.name ?? t("a user"),
      });
      break;
    case "documents.remove_user":
      meta = t("{{userName}} removed {{removedUserName}}", {
        ...opts,
        removedUserName: event.user?.name ?? t("a user"),
      });
      break;

    case "documents.restore":
      meta = t("{{userName}} moved from trash", opts);
      break;

    case "documents.publish":
      icon = <PublishIcon size={16} />;
      meta = t("{{userName}} published", opts);
      break;

    case "documents.unpublish":
      icon = <UnpublishIcon size={16} />;
      meta = t("{{userName}} unpublished", opts);
      break;

    case "documents.move":
      icon = <MoveIcon size={16} />;
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

  return (
    <BaseItem
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
      image={<Avatar model={event.actor} size={AvatarSize.Large} />}
      subtitle={
        <Subtitle>
          {icon}
          {meta}
        </Subtitle>
      }
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
  );
};

const BaseItem = React.forwardRef(function _BaseItem(
  { to, ...rest }: ItemProps,
  ref?: React.Ref<HTMLAnchorElement>
) {
  return <ListItem to={to} ref={ref} {...rest} />;
});

const StyledEventBoundary = styled(EventBoundary)`
  height: 24px;
`;

const Subtitle = styled.span`
  svg {
    margin: -3px;
    margin-right: 2px;
  }
`;

const ItemStyle = css`
  border: 0;
  position: relative;
  margin: 8px 0;
  padding: 8px;
  border-radius: 8px;

  img {
    border-color: transparent;
  }

  &::before {
    content: "";
    display: block;
    position: absolute;
    top: -4px;
    left: 23px;
    width: 2px;
    height: calc(100% + 8px);
    background: ${s("textSecondary")};
    opacity: 0.25;
  }

  &:nth-child(2)::before {
    height: 50%;
    top: auto;
    bottom: -4px;
  }

  &:last-child::before {
    height: 50%;
  }

  &:first-child:last-child::before {
    display: none;
  }

  ${Actions} {
    opacity: 0.5;

    &: ${hover} {
      opacity: 1;
    }
  }
`;

const ListItem = styled(Item)`
  ${ItemStyle}
`;

export default observer(EventListItem);
