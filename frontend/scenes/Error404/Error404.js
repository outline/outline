// @flow
import React from 'react';
import { Link } from 'react-router-dom';

import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

class Error404 extends React.Component {
  render() {
    return (
      <Layout>
        <PageTitle title="Not found" />
        <CenteredContent>
          <h1>Not Found</h1>

          <p>We're unable to find the page you're accessing.</p>

          <p>Maybe you want to try <Link to="/search">search</Link> instead?</p>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Error404;
