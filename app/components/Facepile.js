// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import styled, { withTheme } from 'styled-components';
import Flex from 'shared/components/Flex';
import Avatar from 'components/Avatar';
import User from 'models/User';

type Props = {
  users: User[],
  overflow: number,
  renderAvatar: (user: User) => React.Node,
};

@observer
class Facepile extends React.Component<Props> {
  render() {
    const { users, overflow, renderAvatar = renderDefaultAvatar } = this.props;

    return (
      <Avatars>
        {overflow > 0 && <More>+{overflow}</More>}
        {users.map(user => (
          <AvatarWrapper key={user.id}>{renderAvatar(user)}</AvatarWrapper>
        ))}
      </Avatars>
    );
  }
}

function renderDefaultAvatar(user: User) {
  return <Avatar user={user} src={user.avatarUrl} size={32} />;
}

const AvatarWrapper = styled.div`
  margin-right: -8px;
  &:first-child {
    margin-right: 0;
  }
`;

const More = styled.div`
  min-width: 30px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.theme.slate};
  color: ${props => props.theme.text};
  border: 2px solid ${props => props.theme.background};
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: pointer;
`;

export default inject('views', 'presence')(withTheme(Facepile));
