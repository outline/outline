// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import Event from "models/Event";
import Avatar from "components/Avatar";
import Item from "components/List/Item";
import Time from "components/Time";
import RevisionMenu from "menus/RevisionMenu";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  event: Event,
|};

const EventListItem = ({ event, document }: Props) => {
  const { t } = useTranslation();
  const opts = { userName: event.actor.name };
  const isRevision = event.name === "revisions.create";
  let meta, to;

  switch (event.name) {
    case "revisions.create":
      meta = t("{{userName}} edited", opts);
      to = documentHistoryUrl(document, event.modelId || "");
      break;
    case "documents.archive":
      meta = t("{{userName}} archived", opts);
      break;
    case "documents.current_version":
      meta = t("Current version");
      to = documentHistoryUrl(document);
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
  padding: 12px;

  &::before {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 27px;
    width: 2px;
    height: 100%;
    background: ${(props) => props.theme.divider};
  }

  &:first-child::before {
    height: 50%;
    top: 50%;
  }

  &:last-child::before {
    height: 50%;
  }

  &:first-child:last-child::before {
    display: none;
  }
`;

export default EventListItem;
