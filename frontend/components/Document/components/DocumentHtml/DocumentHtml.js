import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react';

import styles from './DocumentHtml.scss';

@observer class DocumentHtml extends React.Component {
  static propTypes = {
    html: PropTypes.string.isRequired,
  };

  componentDidMount = () => {
    this.setExternalLinks();
  };

  componentDidUpdate = () => {
    this.setExternalLinks();
  };

  setExternalLinks = () => {
    const links = ReactDOM.findDOMNode(this).querySelectorAll('a');
    links.forEach(link => {
      if (link.hostname !== window.location.hostname) {
        link.target = '_blank'; // eslint-disable-line no-param-reassign
      }
    });
  };

  render() {
    return (
      <div
        className={styles.document}
        dangerouslySetInnerHTML={{ __html: this.props.html }}
      />
    );
  }
}

export default DocumentHtml;
