// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Redirect } from 'react-router-dom';
import AuthStore from 'stores/AuthStore';

type Props = {
  auth: AuthStore,
};

@observer
class Home extends React.Component<Props> {

  render() {
    const { auth } = this.props;
    if (auth.authenticated) return <Redirect to="/dashboard" />;
    auth.logout();
    return null;  
  }
}

export default inject('auth')(Home);
