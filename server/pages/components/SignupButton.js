// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from '../../../shared/styles/constants';

const SlackSignin = () => {
  return <Button href="/auth/slack">Sign In with Slack</Button>;
};

const Button = styled.a`
  display: inline-block;
  padding: 10px 20px;
  color: ${color.white};
  background: ${color.black};
  border-radius: 4px;
  font-weight: 500;
`;

export default SlackSignin;
