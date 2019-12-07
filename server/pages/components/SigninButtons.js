// @flow
import * as React from 'react';
import styled from 'styled-components';
import Button from './Button';
import { signin } from '../../../shared/utils/routeHelpers';
import Flex from '../../../shared/components/Flex';
import Notice from '../../../shared/components/Notice';
import GoogleLogo from '../../../shared/components/GoogleLogo';
import SlackLogo from '../../../shared/components/SlackLogo';
import breakpoint from 'styled-components-breakpoint';

type Props = {
  lastSignedIn?: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
  guestSigninEnabled?: boolean,
};

const SigninButtons = ({
  lastSignedIn,
  slackSigninEnabled,
  googleSigninEnabled,
  guestSigninEnabled,
}: Props) => {
  return (
    <Wrapper>
      {!slackSigninEnabled &&
        !googleSigninEnabled && (
          <Notice>
            Neither Slack or Google sign in is enabled. You must configure at
            least one authentication method to sign in to Outline.
          </Notice>
        )}
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

  ${breakpoint('tablet')`
    &:first-child {
      margin-right: 8px;
    }
  `};
`;

const Wrapper = styled(Flex)`
  display: block;
  justify-content: center;
  margin-top: 16px;

  ${breakpoint('tablet')`
    display: flex;
    justify-content: flex-start;
    margin-top: 0;
  `};
`;

const Spacer = styled.span`
  padding-left: 10px;
`;

const LastLogin = styled.p`
  font-size: 13px;
  font-weight: 500;
  color: rgba(20, 23, 26, 0.5);
  padding-top: 4px;
`;

export default SigninButtons;
