// @flow
import React from 'react';
import { Link } from 'react-router-dom';

import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

class ErrorAuth extends React.Component {
  render() {
    return (
      <Layout>
        <PageTitle title="Authentication error" />
        <CenteredContent>
          <h1>Authentication failed</h1>

          <p>
            We were unable to log you in. <Link to="/">Please try again.</Link>
          </p>
        </CenteredContent>
      </Layout>
    );
  }
}

export default ErrorAuth;
