import {
  TrashIcon,
  ArchiveIcon,
  EditIcon,
  PublishIcon,
  MoveIcon,
  CheckboxIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { CompositeStateReturn } from "reakit/Composite";
import styled, { css } from "styled-components";
import Document from "~/models/Document";
import Event from "~/models/Event";
import Avatar from "~/components/Avatar";
import CompositeItem, {
  Props as ItemProps,
} from "~/components/List/CompositeItem";
import Item, { Actions } from "~/components/List/Item";
import Time from "~/components/Time";
import usePolicy from "~/hooks/usePolicy";
import RevisionMenu from "~/menus/RevisionMenu";
import { documentHistoryUrl } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  event: Event;
  latest?: boolean;
} & CompositeStateReturn;

const EventListItem = ({ event, latest, document, ...rest }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const can = usePolicy(document.id);
  const opts = {
    userName: event.actor.name,
  };
  const isRevision = event.name === "revisions.create";
  let meta, icon, to;

  const ref = React.useRef<HTMLAnchorElement>(null);
  // the time component tends to steal focus when clicked
  // ...so forward the focus back to the parent item
  const handleTimeClick = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  switch (event.name) {
    case "revisions.create":
    case "documents.latest_version": {
      if (latest) {
        icon = <CheckboxIcon color="currentColor" size={16} checked />;
        meta = t("Latest version");
        to = documentHistoryUrl(document);
        break;
      } else {
        icon = <EditIcon color="currentColor" size={16} />;
        meta = t("{{userName}} edited", opts);
        to = documentHistoryUrl(document, event.modelId || "");
        break;
      }
    }

    case "documents.archive":
      icon = <ArchiveIcon color="currentColor" size={16} />;
      meta = t("{{userName}} archived", opts);
      break;

    case "documents.unarchive":
      meta = t("{{userName}} restored", opts);
      break;

    case "documents.delete":
      icon = <TrashIcon color="currentColor" size={16} />;
      meta = t("{{userName}} deleted", opts);
      break;

    case "documents.restore":
      meta = t("{{userName}} moved from trash", opts);
      break;

    case "documents.publish":
      icon = <PublishIcon color="currentColor" size={16} />;
      meta = t("{{userName}} published", opts);
      break;

    case "documents.move":
      icon = <MoveIcon color="currentColor" size={16} />;
      meta = t("{{userName}} moved", opts);
      break;

    default:
      console.warn("Unhandled event: ", event.name);
  }

  if (!meta) {
    return null;
  }

  const isActive = location.pathname === to;

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
          tooltipDelay={500}
          format={{
            en_US: "MMM do, h:mm a",
            fr_FR: "'Le 'd MMMM 'à' H:mm",
          }}
          relative={false}
          addSuffix
          onClick={handleTimeClick}
        />
      }
      image={<Avatar src={event.actor?.avatarUrl} size={32} />}
      subtitle={
        <Subtitle>
          {icon}
          {meta}
        </Subtitle>
      }
      actions={
        isRevision && isActive && event.modelId && can.update ? (
          <RevisionMenu document={document} revisionId={event.modelId} />
        ) : undefined
      }
      ref={ref}
      {...rest}
    />
  );
};

const BaseItem = React.forwardRef(
  ({ to, ...rest }: ItemProps, ref?: React.Ref<HTMLAnchorElement>) => {
    if (to) {
      return <CompositeListItem to={to} ref={ref} {...rest} />;
    }

    return <ListItem ref={ref} {...rest} />;
  }
);

const Subtitle = styled.span`
  svg {
    margin: -3px;
    margin-right: 2px;
  }
`;

const ItemStyle = css`
  border: 0;
  position: relative;
  margin: 8px;
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
    background: ${(props) => props.theme.textSecondary};
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

    &:hover {
      opacity: 1;
    }
  }
`;

const ListItem = styled(Item)`
  ${ItemStyle}
`;

const CompositeListItem = styled(CompositeItem)`
  ${ItemStyle}
`;

export default EventListItem;
