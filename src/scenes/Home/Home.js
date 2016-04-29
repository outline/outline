import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { replace } from 'react-router-redux';

import auth from '../../utils/auth';

import SlackAuthLink from '../../components/SlackAuthLink';

import styles from './Home.scss';

class Home extends React.Component {
  static propTypes = {
    replace: React.PropTypes.func.isRequired,
  }

  componentDidMount = () => {
    if (auth.loggedIn()) {
      this.props.replace('/dashboard');
    }
  }

  render() {
    return (
      <div className={ styles.container }>
        <div className={ styles.content }>
          <div className={ styles.intro }>
            <p>
              Hi there,
            </p>
            <p>
              We're building the best place for engineers, designers and teams to
              share ideas, tell stories and build knowledge.
            </p>
            <p>
              <strong>**Atlas**</strong> can start as a wiki, but it's really
              up to you what you want to make of it:
            </p>
            <p>
              - Write documentation in <i>_markdown_</i><br/>
              - Build a blog around the API<br/>
              - Hack the frontend for your needs (coming!)<br/>
            </p>
            <p>
              We're just getting started.
            </p>
          </div>
          <div className={ styles.action }>
            <SlackAuthLink />
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ replace }, dispatch)
}

export default connect(
  null, mapDispatchToProps
)(Home);