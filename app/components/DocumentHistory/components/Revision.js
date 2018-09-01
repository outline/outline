// @flow
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import Time from 'shared/components/Time';
import Avatar from 'components/Avatar';

import { documentHistoryUrl } from 'utils/routeHelpers';

export default class Revision extends React.Component<*> {
  render() {
    const { revision, document } = this.props;

    return (
      <StyledNavLink
        to={documentHistoryUrl(document, revision.id)}
        activeStyle={{ background: 'lightblue' }}
      >
        <Author>
          <Avatar src={revision.createdBy.avatarUrl} />{' '}
          {revision.createdBy.name}
        </Author>
        <Meta>
          <Time dateTime={revision.createdAt} /> ago
        </Meta>
      </StyledNavLink>
    );
  }
}

const StyledNavLink = styled(NavLink)`
  display: block;
  padding: 16px;
  font-size: 15px;
`;

const Author = styled.p`
  color: ${props => props.theme.text};
  padding: 0;
  margin: 0;
`;

const Meta = styled.span`
  font-size: 14px;
  color: ${props => props.theme.slate};
`;
