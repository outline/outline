// @flow
import * as React from 'react';
import styled from 'styled-components';
import { signin } from '../../../shared/utils/routeHelpers';
import Flex from '../../../shared/components/Flex';
import GoogleLogo from '../../../shared/components/GoogleLogo';
import SlackLogo from '../../../shared/components/SlackLogo';
import breakpoint from 'styled-components-breakpoint';

type Props = {
  lastSignedIn?: string,
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
        <Column column>
          <Button href={signin('slack')}>
            <SlackLogo />
            <Spacer>Sign In with Slack</Spacer>
          </Button>
          <LastLogin>
            {lastSignedIn === 'slack' && 'You signed in with Slack previously'}
          </LastLogin>
        </Column>
      )}
      {googleSigninEnabled && (
        <Column column>
          <Button href={signin('google')}>
            <GoogleLogo />
            <Spacer>Sign In with Google</Spacer>
          </Button>
          <LastLogin>
            {lastSignedIn === 'google' &&
              'You signed in with Google previously'}
          </LastLogin>
        </Column>
      )}
    </Wrapper>
  );
};

const Column = styled(Flex)`
  text-align: center;

  &:first-child {
    margin-right: 8px;
  }
`;

const Wrapper = styled(Flex)`
  display: block;
  justify-content: center;

  ${breakpoint('tablet')`
    display: flex;
    justify-content: flex-start;
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
  font-size: 13px;
  font-weight: 500;
  color: rgba(20, 23, 26, 0.5);
  padding-top: 4px;
`;

export default SigninButtons;
