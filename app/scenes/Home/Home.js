// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
};

const Home = observer((props: Props) => {
  if (props.auth.authenticated) return <Redirect to="/dashboard" />;
  window.location.href = BASE_URL;
  return null;
});

export default inject('auth')(Home);
