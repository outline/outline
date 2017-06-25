// @flow
import React from 'react';
import { Link } from 'react-router-dom';

import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

class ErrorAuth extends React.Component {
  render() {
    return (
      <CenteredContent>
        <PageTitle title="Authentication error" />
        <h1>Authentication failed</h1>

        <p>
          We were unable to log you in. <Link to="/">Please try again.</Link>
        </p>
      </CenteredContent>
    );
  }
}

export default ErrorAuth;
