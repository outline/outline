// @flow
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import styled, { withTheme } from 'styled-components';
import format from 'date-fns/format';

import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import Avatar from 'components/Avatar';
import RevisionMenu from 'menus/RevisionMenu';

import { documentHistoryUrl } from 'utils/routeHelpers';

class Revision extends React.Component<*> {
  render() {
    const { revision, document, theme } = this.props;

    return (
      <StyledNavLink
        to={documentHistoryUrl(document, revision.id)}
        activeStyle={{ background: theme.primary, color: theme.white }}
      >
        <Author>
          <Avatar src={revision.createdBy.avatarUrl} />{' '}
          {revision.createdBy.name}
        </Author>
        <Meta>
          <Time dateTime={revision.createdAt}>
            {format(revision.createdAt, 'MMMM Do, YYYY h:mm a')}
          </Time>
        </Meta>
        <StyledRevisionMenu document={document} revision={revision} />
      </StyledNavLink>
    );
  }
}

const StyledRevisionMenu = styled(RevisionMenu)`
  position: absolute;
  right: 0;
`;

const StyledNavLink = styled(NavLink)`
  color: ${props => props.theme.text};
  display: block;
  padding: 16px;
  font-size: 15px;
  position: relative;
`;

const Author = styled(Flex)`
  padding: 0;
  margin: 0;
`;

const Meta = styled.span`
  font-size: 14px;
  opacity: 0.5;
`;

export default withTheme(Revision);
