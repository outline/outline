import React from 'react';
import Portal from 'react-portal';
import classnames from 'classnames';
import isEqual from 'lodash/isEqual';
import FormattingToolbar from './components/FormattingToolbar';
import LinkToolbar from './components/LinkToolbar';
import styles from './Toolbar.scss';

export default class Toolbar extends React.Component {
  state = {
    active: false,
  };

  componentDidMount = () => {
    this.update();
  };

  componentDidUpdate = () => {
    this.update();
  };

  handleFocus = () => {
    this.setState({ focused: true });
  };

  handleBlur = () => {
    this.setState({ focused: false });
  };

  update = () => {
    const { state } = this.props;

    if (state.isBlurred || state.isCollapsed) {
      if (this.state.active && !this.state.focused)
        this.setState({ active: false, link: null, top: '', left: '' });
      return;
    }

    const data = {
      ...this.state,
      active: true,
      link: null,
    };
    const selectedLinks = state.startBlock
      .getInlinesAtRange(state.selection)
      .filter(node => node.type === 'link');
    if (selectedLinks.size) {
      const firstLink = selectedLinks.first();
      data.link = firstLink;
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    data.top = `${rect.top + window.scrollY - this.menu.offsetHeight}px`;
    data.left = `${rect.left + window.scrollX - this.menu.offsetWidth / 2 + rect.width / 2}px`;

    if (!isEqual(data, this.state)) {
      this.setState(data);
    }
  };

  setRef = ref => {
    this.menu = ref;
  };

  render() {
    const link = this.state.link;
    const classes = classnames(styles.menu, {
      [styles.active]: this.state.active,
    });

    const style = {
      top: this.state.top,
      left: this.state.left,
    };

    return (
      <Portal isOpened>
        <div className={classes} style={style} ref={this.setRef}>
          {link &&
            <LinkToolbar
              {...this.props}
              link={link}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            />}
          {!link && <FormattingToolbar {...this.props} />}
        </div>
      </Portal>
    );
  }
}
