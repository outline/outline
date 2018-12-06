// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import Grid from 'styled-components-grid';
import Hero from './components/Hero';
import HeroText from './components/HeroText';
import SigninButtons from './components/SigninButtons';
import AuthErrors from './components/AuthErrors';
import Centered from './components/Centered';
import { Team } from '../models';

type Props = {
  team: Team,
  notice?: 'google-hd' | 'auth-error' | 'hd-not-allowed',
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
  hostname: string,
};

function SubdomainSignin({
  team,
  lastSignedIn,
  notice,
  googleSigninEnabled,
  slackSigninEnabled,
  hostname,
}: Props) {
  googleSigninEnabled = !!team.googleId && googleSigninEnabled;
  slackSigninEnabled = !!team.slackId && slackSigninEnabled;

  // only show the "last signed in" hint if there is more than one option available
  const signinHint =
    googleSigninEnabled && slackSigninEnabled ? lastSignedIn : undefined;

  return (
    <React.Fragment>
      <Helmet>
        <title>Outline - Sign in to {team.name}</title>
      </Helmet>
      <Grid>
        <Hero>
          <h1>{lastSignedIn ? 'Welcome back,' : 'Hey there,'}</h1>
          <HeroText>
            Sign in with your team account to continue to {team.name}.
            <Subdomain>{hostname}</Subdomain>
          </HeroText>
          <p>
            <SigninButtons
              googleSigninEnabled={googleSigninEnabled}
              slackSigninEnabled={slackSigninEnabled}
              lastSignedIn={signinHint}
            />
          </p>
          <AuthErrors notice={notice} />
        </Hero>
      </Grid>
      <Alternative>
        <p>
          Trying to create or sign in to a different team?{' '}
          <a href={process.env.URL}>Head to the homepage</a>.
        </p>
      </Alternative>
    </React.Fragment>
  );
}

const Subdomain = styled.span`
  display: block;
  font-weight: 500;
  font-size: 16px;
  margin-top: 0;
`;

const Alternative = styled(Centered)`
  padding: 2em 0;
  text-align: center;
`;

export default SubdomainSignin;
