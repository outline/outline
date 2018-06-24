// @flow
import * as React from 'react';
import styled from 'styled-components';
import { signin } from '../../../shared/utils/routeHelpers';
import Flex from '../../../shared/components/Flex';
import GoogleLogo from '../../../shared/components/GoogleLogo';
import SlackLogo from '../../../shared/components/SlackLogo';
import breakpoint from 'styled-components-breakpoint';

type Props = {
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
};

const SigninButtons = ({
  lastSignedIn,
  slackSigninEnabled,
  googleSigninEnabled,
}: Props) => {
  return (
    <Wrapper>
      {slackSigninEnabled && (
        <Flex column>
          <Button href={signin('slack')}>
            <SlackLogo />
            <Spacer>Sign In with Slack</Spacer>
          </Button>
          <LastLogin>
            {lastSignedIn === 'slack' && 'You signed in with Slack previously'}
          </LastLogin>
        </Flex>
      )}
      &nbsp;
      {googleSigninEnabled && (
        <Flex column>
          <Button href={signin('google')}>
            <GoogleLogo />
            <Spacer>Sign In with Google</Spacer>
          </Button>
          <LastLogin>
            {lastSignedIn === 'google' &&
              'You signed in with Google previously'}
          </LastLogin>
        </Flex>
      )}
    </Wrapper>
  );
};

const Wrapper = styled(Flex)`
  display: block;
  justify-content: center;

  ${breakpoint('tablet')`
    display: flex;
  `};
`;

const Spacer = styled.span`
  padding-left: 10px;
`;

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  color: ${props => props.theme.white};
  background: ${props => props.theme.black};
  border-radius: 4px;
  font-weight: 600;
  height: 56px;
`;

const LastLogin = styled.p`
  font-size: 12px;
  color: ${props => props.theme.slate};
  padding-top: 4px;
`;

export default SigninButtons;
