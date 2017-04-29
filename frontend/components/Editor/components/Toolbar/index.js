import React from 'react';
import Portal from 'react-portal';
import styles from './Toolbar.scss';

export default class Toolbar extends React.Component {
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

  handleOpen = portal => {
    this.menu = portal.firstChild;
  };

  update = () => {
    const { state } = this.props;
    if (state.isBlurred || state.isCollapsed) {
      this.menu.removeAttribute('style');
      return;
    }

    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    this.menu.style.opacity = 1;
    this.menu.style.top = `${rect.top + window.scrollY - this.menu.offsetHeight}px`;
    this.menu.style.left = `${rect.left + window.scrollX - this.menu.offsetWidth / 2 + rect.width / 2}px`;
  };

  render() {
    return (
      <Portal isOpened onOpen={this.handleOpen}>
        <div className={styles.menu}>
          {this.renderMarkButton('bold', 'B')}
          {this.renderMarkButton('italic', 'I')}
          {this.renderMarkButton('underlined', 'U')}
          {this.renderMarkButton('code', 'C')}
        </div>
      </Portal>
    );
  }
}
