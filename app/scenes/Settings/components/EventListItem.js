// @flow
import * as React from 'react';
import { Link } from 'react-router-dom';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import Time from 'shared/components/Time';
import ListItem from 'components/List/Item';
import Avatar from 'components/Avatar';
import Event from 'models/Event';

type Props = {
  event: Event,
};

const description = event => {
  switch (event.name) {
    case 'teams.create':
      return 'Created the team';
    case 'shares.create':
    case 'shares.revoke':
      return (
        <React.Fragment>
          {capitalize(event.verbPastTense)} a{' '}
          <Link to={`/share/${event.modelId || ''}`}>public link</Link> to a{' '}
          <Link to={`/doc/${event.documentId}`}>document</Link>
        </React.Fragment>
      );
    case 'users.create':
      return (
        <React.Fragment>{event.data.name} created an account</React.Fragment>
      );
    case 'users.invite':
      return (
        <React.Fragment>
          {capitalize(event.verbPastTense)} {event.data.name} (<a
            href={`mailto:${event.data.email || ''}`}
          >
            {event.data.email || ''}
          </a>)
        </React.Fragment>
      );
    case 'collections.add_user':
      return (
        <React.Fragment>
          Added {event.data.name} to a private{' '}
          <Link to={`/collections/${event.collectionId || ''}`}>
            collection
          </Link>
        </React.Fragment>
      );
    case 'collections.remove_user':
      return (
        <React.Fragment>
          Remove {event.data.name} from a private{' '}
          <Link to={`/collections/${event.collectionId || ''}`}>
            collection
          </Link>
        </React.Fragment>
      );
    default:
  }

  if (event.documentId) {
    return (
      <React.Fragment>
        {capitalize(event.verbPastTense)} a{' '}
        <Link to={`/doc/${event.documentId}`}>document</Link>
      </React.Fragment>
    );
  }
  if (event.collectionId) {
    return (
      <React.Fragment>
        {capitalize(event.verbPastTense)} a{' '}
        <Link to={`/collections/${event.collectionId || ''}`}>collection</Link>
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
  return '';
};

const EventListItem = ({ event }: Props) => {
  return (
    <ListItem
      key={event.id}
      title={event.actor.name}
      image={<Avatar src={event.actor.avatarUrl} size={32} />}
      subtitle={
        <React.Fragment>
          {description(event)} <Time dateTime={event.createdAt} /> ago &middot;{' '}
          {event.name}
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

const IP = styled('span')`
  color: ${props => props.theme.textTertiary};
  font-size: 12px;
`;

export default EventListItem;
