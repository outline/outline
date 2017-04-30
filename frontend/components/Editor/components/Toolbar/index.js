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

  focusLinkEditor = () => {
    console.log('focusLinkEditor');
    this.setState({ linkEditorFocused: true });
  };

  blurLinkEditor = () => {
    console.log('blurLinkEditor');
    this.setState({ linkEditorFocused: false });
  };

  updateLink = ev => {
    const transform = this.props.state.transform();
    const data = { href: ev.target.value };
    transform.unwrapInline('link');
    const state = transform.wrapInline({ type: 'link', data }).apply();
    this.props.onChange(state);
  };

  renderLinkEditor = link => {
    return (
      <input
        defaultValue={link.data.get('href')}
        onMouseDown={this.focusLinkEditor}
        onBlur={this.blurLinkEditor}
        onChange={this.updateLink}
      />
    );
  };

  update = () => {
    const { state } = this.props;
    if (state.isBlurred || state.isCollapsed) {
      if (this.state.active && !this.state.linkEditorFocused)
        this.setState({ active: false, link: false, top: '', left: '' });
      return;
    }

    if (!this.state.active) {
      const data = {
        active: true,
      };
      const linksInSelection = state.startBlock
        .getInlinesAtRange(state.selection)
        .filter(node => node.type === 'link');
      if (linksInSelection.size) {
        const firstLink = linksInSelection.first();
        console.log('selected a link', firstLink.toJS());
        data.link = firstLink;
      }

      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      data.top = `${rect.top + window.scrollY - this.menu.offsetHeight}px`;
      data.left = `${rect.left + window.scrollX - this.menu.offsetWidth / 2 + rect.width / 2}px`;

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
          {link && this.renderLinkEditor(link)}
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
