import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { replace } from 'react-router-redux';

import { client } from 'utils/ApiClient';

import Layout from 'components/Layout';
import styles from './Dashboard.scss';

class Dashboard extends React.Component {
  static propTypes = {
    replace: React.PropTypes.func.isRequired,
  }

  render() {
    return (
      <Layout
        header={<div>header!</div>}
      >
        holla!
      </Layout>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ replace }, dispatch)
}

export default connect(
  null, mapDispatchToProps
)(Dashboard);
