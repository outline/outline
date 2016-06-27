import React from 'react';
import { observer } from 'mobx-react';
import { browserHistory } from 'react-router'

import SlackAuthLink from 'components/SlackAuthLink';

import styles from './Home.scss';

@observer(['user'])
export default class Home extends React.Component {
  static propTypes = {
    user: React.PropTypes.object.isRequired,
  }

  componentDidMount = () => {
    if (this.props.user.authenticated) {
      browserHistory.replace('/dashboard');
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
