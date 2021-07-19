// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import Event from "models/Event";
import Avatar from "components/Avatar";
import Item, { Actions } from "components/List/Item";
import Time from "components/Time";
import RevisionMenu from "menus/RevisionMenu";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  event: Event,
  latest?: boolean,
|};

const EventListItem = ({ event, latest, document }: Props) => {
  const { t } = useTranslation();
  const opts = { userName: event.actor.name };
  const isRevision = event.name === "revisions.create";
  let meta, to;

  switch (event.name) {
    case "revisions.create":
    case "documents.latest_version": {
      if (latest) {
        meta = t("Latest version");
        to = documentHistoryUrl(document);
        break;
      } else {
        meta = t("{{userName}} edited", opts);
        to = documentHistoryUrl(document, event.modelId || "");
        break;
      }
    }
    case "documents.archive":
      meta = t("{{userName}} archived", opts);
      break;
    case "documents.unarchive":
      meta = t("{{userName}} restored", opts);
      break;
    case "documents.delete":
      meta = t("{{userName}} deleted", opts);
      break;
    case "documents.restore":
      meta = t("{{userName}} moved from trash", opts);
      break;
    case "documents.publish":
      meta = t("{{userName}} published", opts);
      break;
    case "documents.move":
      meta = t("{{userName}} moved", opts);
      break;
    default:
      console.warn("Unhandled event: ", event.name);
  }

  if (!meta) {
    return null;
  }

  return (
    <ListItem
      small
      exact
      to={to}
      title={
        <Time
          dateTime={event.createdAt}
          tooltipDelay={250}
          format="MMMM do, h:mm a"
          relative={false}
          addSuffix
        />
      }
      image={<Avatar src={event.actor?.avatarUrl} size={32} />}
      subtitle={meta}
      actions={
        isRevision ? (
          <RevisionMenu document={document} revisionId={event.modelId} />
        ) : undefined
      }
    />
  );
};

const ListItem = styled(Item)`
  border: 0;
  position: relative;
  margin: 4px;
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
    height: calc(100% + 4px);
    background: ${(props) => props.theme.textSecondary};
    opacity: 0.25;
  }

  &:nth-child(2)::before {
    height: 50%;
    top: 50%;
  }

  &:last-child::before {
    height: 50%;
  }

  &:first-child:last-child::before {
    display: none;
  }

  ${Actions} {
    opacity: 0.25;
    transition: opacity 100ms ease-in-out;
  }

  &:hover {
    ${Actions} {
      opacity: 1;
    }
  }
`;

export default EventListItem;
