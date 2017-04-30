import React from 'react';
import Portal from 'react-portal';
import classnames from 'classnames';
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

  /**
   * Check if the current selection has a mark with `type` in it.
   *
   * @param {String} type
   * @return {Boolean}
   */
  hasMark = type => {
    return this.props.state.marks.some(mark => mark.type === type);
  };

  /**
   * When a mark button is clicked, toggle the current mark.
   *
   * @param {Event} e
   * @param {String} type
   */
  onClickMark = (e, type) => {
    e.preventDefault();
    let { state } = this.props;

    state = state.transform().toggleMark(type).apply();

    this.props.onChange(state);
  };

  renderMarkButton = (type, icon) => {
    const isActive = this.hasMark(type);
    const onMouseDown = e => this.onClickMark(e, type);

    return (
      <span
        className={styles.button}
        onMouseDown={onMouseDown}
        data-active={isActive}
      >
        {icon}
      </span>
    );
  };

  update = () => {
    const { state } = this.props;
    if (state.isBlurred || state.isCollapsed) {
      if (this.state.active)
        this.setState({ active: false, top: '', left: '' });
      return;
    }

    if (!this.state.active) {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const top = `${rect.top + window.scrollY - this.menu.offsetHeight}px`;
      const left = `${rect.left + window.scrollX - this.menu.offsetWidth / 2 + rect.width / 2}px`;

      this.setState({
        active: true,
        top,
        left,
      });
    }
  };

  setRef = ref => {
    this.menu = ref;
  };

  render() {
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
          {this.renderMarkButton('bold', 'B')}
          {this.renderMarkButton('italic', 'I')}
          {this.renderMarkButton('strikethrough', 'S')}
          {this.renderMarkButton('underlined', 'U')}
          {this.renderMarkButton('code', 'C')}
        </div>
      </Portal>
    );
  }
}
