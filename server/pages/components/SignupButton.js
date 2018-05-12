// @flow
import * as React from 'react';
import styled from 'styled-components';
import { signin } from '../../../shared/utils/routeHelpers';
import SlackLogo from '../../../shared/components/SlackLogo';
import { color } from '../../../shared/styles/constants';

const SlackSignin = () => {
  return (
    <Button href={signin()}>
      <SlackLogo />
      <Spacer>Sign In with Slack</Spacer>
    </Button>
  );
};

const Spacer = styled.span`
  padding-left: 10px;
`;

const Button = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  color: ${color.white};
  background: ${color.black};
  border-radius: 4px;
  font-weight: 600;
`;

export default SlackSignin;
