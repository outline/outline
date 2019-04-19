// @flow
import * as React from 'react';
import Grid from 'styled-components-grid';
import Hero from './components/Hero';
import HeroText from './components/HeroText';
import AuthErrors from './components/AuthErrors';
import Notice from '../../shared/components/Notice';
import PageTitle from './components/PageTitle';

type Props = {
  notice?: 'google-hd' | 'auth-error' | 'hd-not-allowed',
  error?: string,
};

function LdapSignin({ notice, error }: Props) {
  return (
    <React.Fragment>
      <PageTitle title={`Sign using LDAP`} />
      <Grid>
        <Hero>
          <HeroText>Sign in with your LDAP account to continue.</HeroText>
          {ErrorNotice(error, notice)}
          <form action="ldap.callback" method="get">
            <label htmlFor="name">Username</label>
            <input type="text" name="name" id="name" required />
            <br />
            <label htmlFor="pass">Password</label>
            <input type="password" name="pass" id="pass" required />
            <br />
            <input type="submit" name="submit" value="Sign in" />
          </form>
        </Hero>
      </Grid>
    </React.Fragment>
  );
}

function ErrorNotice(error, notice) {
  if (error) {
    return <Notice>{error}</Notice>;
  }
  return <AuthErrors notice={notice} />;
}

export default LdapSignin;
