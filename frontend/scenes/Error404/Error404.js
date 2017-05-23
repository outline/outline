// @flow
import React from 'react';
import { Link } from 'react-router-dom';

import CenteredContent from 'components/CenteredContent';

class Error404 extends React.Component {
  render() {
    return (
      <CenteredContent>
        <h1>Not Found</h1>

        <p>We're unable to find the page you're accessing.</p>

        <p>Maybe you want to try <Link to="/search">search</Link> instead?</p>
      </CenteredContent>
    );
  }
}

export default Error404;
