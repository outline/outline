// @flow
import * as React from "react";
import { Link } from "react-router-dom";
import { capitalize } from "lodash";
import styled from "styled-components";
import Time from "shared/components/Time";
import ListItem from "components/List/Item";
import Avatar from "components/Avatar";
import Event from "models/Event";

type Props = {
  event: Event,
};

const description = event => {
  switch (event.name) {
    case "api_keys.create":
      return (
        <React.Fragment>
          Created the API token <strong>{event.data.name}</strong>
        </React.Fragment>
      );
    case "api_keys.delete":
      return (
        <React.Fragment>
          Revoked the API token <strong>{event.data.name}</strong>
        </React.Fragment>
      );
    case "teams.create":
      return "Created the team";
    case "shares.create":
    case "shares.revoke":
      return (
        <React.Fragment>
          {capitalize(event.verbPastTense)} a{" "}
          <Link to={`/share/${event.modelId || ""}`}>public link</Link> to the{" "}
          <Link to={`/doc/${event.documentId}`}>{event.data.name}</Link>{" "}
          document
        </React.Fragment>
      );
    case "users.create":
      return (
        <React.Fragment>{event.data.name} created an account</React.Fragment>
      );
    case "users.invite":
      return (
        <React.Fragment>
          {capitalize(event.verbPastTense)} {event.data.name} (<a
            href={`mailto:${event.data.email || ""}`}
          >
            {event.data.email || ""}
          </a>)
        </React.Fragment>
      );
    case "users.suspend":
      return (
        <React.Fragment>
          Suspended <strong>{event.data.name}’s</strong> account
        </React.Fragment>
      );
    case "users.activate":
      return (
        <React.Fragment>
          Unsuspended <strong>{event.data.name}’s</strong> account
        </React.Fragment>
      );
    case "users.promote":
      return (
        <React.Fragment>
          Made <strong>{event.data.name}</strong> an admin
        </React.Fragment>
      );
    case "users.demote":
      return (
        <React.Fragment>
          Made <strong>{event.data.name}</strong> a member
        </React.Fragment>
      );
    case "users.delete":
      return "Deleted their account";
    case "groups.create":
      return (
        <React.Fragment>
          Created the group <strong>{event.data.name}</strong>
        </React.Fragment>
      );
    case "groups.update":
      return (
        <React.Fragment>
          Update the group <strong>{event.data.name}</strong>
        </React.Fragment>
      );
    case "groups.delete":
      return (
        <React.Fragment>
          Deleted the group <strong>{event.data.name}</strong>
        </React.Fragment>
      );
    case "collections.add_user":
    case "collections.add_group":
      return (
        <React.Fragment>
          Granted <strong>{event.data.name}</strong> access to a{" "}
          <Link to={`/collections/${event.collectionId || ""}`}>
            collection
          </Link>
        </React.Fragment>
      );
    case "collections.remove_user":
    case "collections.remove_group":
      return (
        <React.Fragment>
          Revoked <strong>{event.data.name}</strong> access to a{" "}
          <Link to={`/collections/${event.collectionId || ""}`}>
            collection
          </Link>
        </React.Fragment>
      );
    default:
  }

  if (event.documentId) {
    if (event.name === "documents.delete") {
      return (
        <React.Fragment>
          Deleted the <strong>{event.data.title}</strong> document
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        {capitalize(event.verbPastTense)} the{" "}
        <Link to={`/doc/${event.documentId}`}>{event.data.title}</Link> document
      </React.Fragment>
    );
  }
  if (event.collectionId) {
    if (event.name === "collections.delete") {
      return (
        <React.Fragment>
          Deleted the <strong>{event.data.name}</strong> collection
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        {capitalize(event.verbPastTense)} the{" "}
        <Link to={`/collections/${event.collectionId || ""}`}>
          {event.data.name}
        </Link>{" "}
        collection
      </React.Fragment>
    );
  }
  if (event.userId) {
    return (
      <React.Fragment>
        {capitalize(event.verbPastTense)} the user {event.data.name}
      </React.Fragment>
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
        <React.Fragment>
          {description(event)} <Time dateTime={event.createdAt} /> ago &middot;{" "}
          <strong>{event.name}</strong>
        </React.Fragment>
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
        ) : (
          undefined
        )
      }
    />
  );
};

const IP = styled("span")`
  color: ${props => props.theme.textTertiary};
  font-size: 12px;
`;

export default EventListItem;
