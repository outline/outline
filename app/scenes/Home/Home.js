// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router-dom';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
};

const Home = observer(({ auth }: Props) => {
  if (auth.authenticated) return <Redirect to="/dashboard" />;
  auth.logout();

  window.location.href = BASE_URL;
  return null;
});

export default inject('auth')(Home);
