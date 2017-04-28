import React from 'react';
import { Link } from 'react-router';

import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';

class ErrorAuth extends React.Component {
  render() {
    return (
      <Layout titleText="Not Found">
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
