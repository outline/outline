// @flow
import React from 'react';

import styles from '../DocumentEdit.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

type Props = {
  children?: ?React.Element<any>,
  onScroll?: Function,
  scrollTop?: ?number,
  fullWidth?: ?boolean,
};

class EditorPane extends React.Component {
  props: Props;

  componentWillReceiveProps = (nextProps: Props) => {
    if (nextProps.scrollTop) {
      this.scrollToPosition(nextProps.scrollTop);
    }
  };

  componentDidMount = () => {
    this.refs.pane.addEventListener('scroll', this.handleScroll);
  };

  componentWillUnmount = () => {
    this.refs.pane.removeEventListener('scroll', this.handleScroll);
  };

  handleScroll = (e: Event) => {
    setTimeout(() => {
      const element = this.refs.pane;
      const contentEl = this.refs.content;
      this.props.onScroll &&
        this.props.onScroll(element.scrollTop / contentEl.offsetHeight);
    }, 50);
  };

  scrollToPosition = (percentage: number) => {
    const contentEl = this.refs.content;

    // Push to edges
    if (percentage < 0.02) percentage = 0;
    if (percentage > 0.99) percentage = 100;

    this.refs.pane.scrollTop = percentage * contentEl.offsetHeight;
  };

  render() {
    return (
      <div
        className={cx(styles.editorPane, { fullWidth: this.props.fullWidth })}
        ref="pane"
      >
        <div ref="content" className={styles.paneContent}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default EditorPane;
