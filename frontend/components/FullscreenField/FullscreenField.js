import React from 'react';

import CenteredContent from 'components/CenteredContent';
import { Button } from 'rebass';

import styles from './FullscreenField.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

class FullscreenField extends React.Component {
  render() {
    return (
      <div className={ styles.container }>
        <CenteredContent>
          <div className={ styles.content }>
            <h2>Create a new collection</h2>
            <p>Collections are spaces where you, your teams or friends can share and collect information.</p>

            <div className={ styles.field }>
              <div className={ styles.label }>Collection name</div>
              <input type="text" placeholder="Meeting notes" />
            </div>

            <div className={ cx(styles.field, styles.description) }>
              <div className={ styles.label }>Description</div>
              <input type="text" placeholder="All your note are belong to us" />
            </div>

            <div className={ styles.field }>
              <button className={ styles.button }>Create collection</button>
            </div>
          </div>
        </CenteredContent>
      </div>
    );
  }
}

export default FullscreenField;
