// @flow
import * as React from 'react';
import { NavLink } from 'react-router-dom';
import styled, { withTheme } from 'styled-components';
import format from 'date-fns/format';
import { MoreIcon } from 'outline-icons';

import Flex from 'shared/components/Flex';
import Time from 'shared/components/Time';
import Avatar from 'components/Avatar';
import RevisionMenu from 'menus/RevisionMenu';
import Document from 'models/Document';
import Revision from 'models/Revision';

import { documentHistoryUrl } from 'utils/routeHelpers';

type Props = {
  theme: Object,
  showMenu: boolean,
  selected: boolean,
  document: Document,
  revision: Revision,
};

class RevisionListItem extends React.Component<Props> {
  render() {
    const { revision, document, showMenu, selected, theme } = this.props;

    return (
      <StyledNavLink
        to={documentHistoryUrl(document, revision.id)}
        activeStyle={{ background: theme.primary, color: theme.white }}
      >
        <Author>
          <StyledAvatar src={revision.createdBy.avatarUrl} />{' '}
          {revision.createdBy.name}
        </Author>
        <Meta>
          <Time dateTime={revision.createdAt}>
            {format(revision.createdAt, 'MMMM Do, YYYY h:mm a')}
          </Time>
        </Meta>
        {showMenu && (
          <StyledRevisionMenu
            document={document}
            revision={revision}
            label={
              <MoreIcon color={selected ? theme.white : theme.textTertiary} />
            }
          />
        )}
      </StyledNavLink>
    );
  }
}

const StyledAvatar = styled(Avatar)`
  border-color: transparent;
  margin-right: 4px;
`;

const StyledRevisionMenu = styled(RevisionMenu)`
  position: absolute;
  right: 16px;
  top: 20px;
`;

const StyledNavLink = styled(NavLink)`
  color: ${props => props.theme.text};
  display: block;
  padding: 8px 16px;
  font-size: 15px;
  position: relative;
`;

const Author = styled(Flex)`
  font-weight: 500;
  padding: 0;
  margin: 0;
`;

const Meta = styled.p`
  font-size: 14px;
  opacity: 0.75;
  margin: 0 0 2px;
  padding: 0;
`;

export default withTheme(RevisionListItem);
