// @flow
import { capitalize } from "lodash";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Event from "models/Event";
import Avatar from "components/Avatar";
import ListItem from "components/List/Item";
import Time from "components/Time";

type Props = {
  event: Event,
};

const description = (event) => {
  switch (event.name) {
    case "api_keys.create":
      return (
        <>
          Created the API token <strong>{event.data.name}</strong>
        </>
      );
    case "api_keys.delete":
      return (
        <>
          Revoked the API token <strong>{event.data.name}</strong>
        </>
      );
    case "teams.create":
      return "Created the team";
    case "shares.create":
    case "shares.revoke":
      return (
        <>
          {capitalize(event.verbPastTense)} a{" "}
          <Link to={`/share/${event.modelId || ""}`}>share link</Link> to the{" "}
          <Link to={`/doc/${event.documentId}`}>{event.data.name}</Link>{" "}
          document
        </>
      );
    case "shares.update":
      return (
        <>
          {event.data.published ? (
            <>
              Published a document{" "}
              <Link to={`/share/${event.modelId || ""}`}>share link</Link>
            </>
          ) : (
            <>
              Unpublished a document{" "}
              <Link to={`/share/${event.modelId || ""}`}>share link</Link>
            </>
          )}
        </>
      );
    case "users.create":
      return <>{event.data.name} created an account</>;
    case "users.invite":
      return (
        <>
          {capitalize(event.verbPastTense)} {event.data.name} (
          <a href={`mailto:${event.data.email || ""}`}>
            {event.data.email || ""}
          </a>
          )
        </>
      );
    case "users.suspend":
      return (
        <>
          Suspended <strong>{event.data.name}’s</strong> account
        </>
      );
    case "users.activate":
      return (
        <>
          Unsuspended <strong>{event.data.name}’s</strong> account
        </>
      );
    case "users.promote":
      return (
        <>
          Made <strong>{event.data.name}</strong> an admin
        </>
      );
    case "users.demote":
      return (
        <>
          Made <strong>{event.data.name}</strong> a member
        </>
      );
    case "users.delete":
      return "Deleted their account";
    case "groups.create":
      return (
        <>
          Created the group <strong>{event.data.name}</strong>
        </>
      );
    case "groups.update":
      return (
        <>
          Update the group <strong>{event.data.name}</strong>
        </>
      );
    case "groups.delete":
      return (
        <>
          Deleted the group <strong>{event.data.name}</strong>
        </>
      );
    case "collections.add_user":
    case "collections.add_group":
      return (
        <>
          Granted <strong>{event.data.name}</strong> access to a{" "}
          <Link to={`/collections/${event.collectionId || ""}`}>
            collection
          </Link>
        </>
      );
    case "collections.remove_user":
    case "collections.remove_group":
      return (
        <>
          Revoked <strong>{event.data.name}</strong> access to a{" "}
          <Link to={`/collections/${event.collectionId || ""}`}>
            collection
          </Link>
        </>
      );
    default:
  }

  if (event.documentId) {
    if (event.name === "documents.delete") {
      return (
        <>
          Deleted the <strong>{event.data.title}</strong> document
        </>
      );
    }
    if (event.name === "documents.create") {
      return (
        <>
          {capitalize(event.verbPastTense)} the{" "}
          <Link to={`/doc/${event.documentId}`}>
            {event.data.title || "Untitled"}
          </Link>{" "}
          document{" "}
          {event.data.templateId && (
            <>
              from a <Link to={`/doc/${event.data.templateId}`}>template</Link>
            </>
          )}
        </>
      );
    }
    return (
      <>
        {capitalize(event.verbPastTense)} the{" "}
        <Link to={`/doc/${event.documentId}`}>
          {event.data.title || "Untitled"}
        </Link>{" "}
        document
      </>
    );
  }
  if (event.collectionId) {
    if (event.name === "collections.delete") {
      return (
        <>
          Deleted the <strong>{event.data.name}</strong> collection
        </>
      );
    }
    return (
      <>
        {capitalize(event.verbPastTense)} the{" "}
        <Link to={`/collections/${event.collectionId || ""}`}>
          {event.data.name}
        </Link>{" "}
        collection
      </>
    );
  }
  if (event.userId) {
    return (
      <>
        {capitalize(event.verbPastTense)} the user {event.data.name}
      </>
    );
  }
  return "";
};

const EventListItem = ({ event }: Props) => {
  return (
    <ListItem
      key={event.id}
      title={event.actor.name}
      image={<Avatar src={event.actor.avatarUrl} size={32} />}
      subtitle={
        <>
          {description(event)} <Time dateTime={event.createdAt} /> ago &middot;{" "}
          <strong>{event.name}</strong>
        </>
      }
      actions={
        event.actorIpAddress ? (
          <IP>
            <a
              href={`http://geoiplookup.net/ip/${event.actorIpAddress}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {event.actorIpAddress}
            </a>
          </IP>
        ) : undefined
      }
    />
  );
};

const IP = styled("span")`
  color: ${(props) => props.theme.textTertiary};
  font-size: 12px;
`;

export default EventListItem;
