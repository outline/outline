import React from 'react';
import classNames from 'classnames/bind';
import styles from '../DocumentEdit.scss';
const cx = classNames.bind(styles);

class EditorPane extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    onScroll: React.PropTypes.func.isRequired,
    scrollTop: React.PropTypes.number,
    fullWidth: React.PropTypes.bool,
  };

  componentWillReceiveProps = nextProps => {
    if (nextProps.scrollTop) {
      this.scrollToPosition(nextProps.scrollTop);
    }
  };

  componentDidMount = () => {
    this.pane.addEventListener('scroll', this.handleScroll);
  };

  componentWillUnmount = () => {
    this.pane.removeEventListener('scroll', this.handleScroll);
  };

  handleScroll = e => {
    setTimeout(() => {
      const element = this.pane;
      const contentEl = this.content;
      this.props.onScroll(element.scrollTop / contentEl.offsetHeight);
    }, 50);
  };

  scrollToPosition = percentage => {
    const contentEl = this.content;

    // Push to edges
    if (percentage < 0.02) percentage = 0;
    if (percentage > 0.99) percentage = 100;

    this.pane.scrollTop = percentage * contentEl.offsetHeight;
  };

  setPaneRef = ref => {
    this.pane = ref;
  };

  setContentRef = ref => {
    this.content = ref;
  };

  render() {
    return (
      <div
        className={cx(styles.editorPane, { fullWidth: this.props.fullWidth })}
        ref={this.setPaneRef}
      >
        <div ref={this.setContentRef} className={styles.paneContent}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default EditorPane;
