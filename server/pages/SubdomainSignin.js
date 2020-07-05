// @flow
import * as React from "react";
import styled from "styled-components";
import Grid from "styled-components-grid";
import Hero from "./components/Hero";
import HeroText from "./components/HeroText";
import Button from "./components/Button";
import SigninButtons from "./components/SigninButtons";
import AuthNotices from "./components/AuthNotices";
import Centered from "./components/Centered";
import PageTitle from "./components/PageTitle";
import { Team } from "../models";

type Props = {
  team: Team,
  guest?: boolean,
  notice?: "google-hd" | "auth-error" | "hd-not-allowed" | "guest-success",
  lastSignedIn: string,
  googleSigninEnabled: boolean,
  slackSigninEnabled: boolean,
  hostname: string,
};

function SubdomainSignin({
  team,
  guest,
  lastSignedIn,
  notice,
  googleSigninEnabled,
  slackSigninEnabled,
  hostname,
}: Props) {
  googleSigninEnabled = !!team.googleId && googleSigninEnabled;
  slackSigninEnabled = !!team.slackId && slackSigninEnabled;

  const guestSigninEnabled = team.guestSignin;
  const guestSigninForm = (
    <div>
      <form method="POST" action="/auth/email">
        <EmailInput type="email" name="email" placeholder="jane@domain.com" />{" "}
        <Button type="submit" as="button">
          Sign In
        </Button>
      </form>
    </div>
  );

  // only show the "last signed in" hint if there is more than one option available
  const signinHint =
    googleSigninEnabled && slackSigninEnabled ? lastSignedIn : undefined;

  return (
    <React.Fragment>
      <PageTitle title={`Sign in to ${team.name}`} />
      <Grid>
        <Hero>
          <h1>{lastSignedIn ? "Welcome back," : "Hey there,"}</h1>
          <AuthNotices notice={notice} />
          {guest && guestSigninEnabled ? (
            <React.Fragment>
              <HeroText>
                Sign in with your email address to continue to {team.name}.
                <Subdomain>{hostname}</Subdomain>
              </HeroText>
              {guestSigninForm}
              <br />

              <HeroText>Have a team account? Sign in with SSO…</HeroText>
              <p>
                <SigninButtons
                  googleSigninEnabled={googleSigninEnabled}
                  slackSigninEnabled={slackSigninEnabled}
                  lastSignedIn={signinHint}
                />
              </p>
            </React.Fragment>
          ) : (
            <React.Fragment>
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

              {guestSigninEnabled && (
                <React.Fragment>
                  <HeroText>Have a guest account? Sign in with email…</HeroText>
                  {guestSigninForm}
                </React.Fragment>
              )}
            </React.Fragment>
          )}
        </Hero>
      </Grid>
      <Alternative>
        <p>
          Trying to create or sign in to a different team?{" "}
          <a href={process.env.URL}>Head to the homepage</a>.
        </p>
      </Alternative>
    </React.Fragment>
  );
}

const EmailInput = styled.input`
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #999;
  min-width: 217px;
  height: 56px;
`;

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
