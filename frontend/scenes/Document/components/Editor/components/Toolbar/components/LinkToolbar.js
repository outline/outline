// @flow
import React, { Component } from 'react';
import type { State } from '../../../types';
import keydown from 'react-keydown';
import styles from '../Toolbar.scss';
import CloseIcon from 'components/Icon/CloseIcon';

@keydown
export default class LinkToolbar extends Component {
  input: HTMLElement;
  props: {
    state: State,
    link: Object,
    onBlur: Function,
    onChange: Function,
  };

  onKeyDown = (ev: SyntheticKeyboardEvent & SyntheticInputEvent) => {
    switch (ev.keyCode) {
      case 13: // enter
        ev.preventDefault();
        return this.save(ev.target.value);
      case 26: // escape
        return this.input.blur();
      default:
    }
  };

  removeLink = () => {
    this.save('');
  };

  save = (href: string) => {
    href = href.trim();
    const transform = this.props.state.transform();
    transform.unwrapInline('link');

    if (href) {
      const data = { href };
      transform.wrapInline({ type: 'link', data });
    }

    const state = transform.apply();
    this.props.onChange(state);
    this.input.blur();
  };

  render() {
    const href = this.props.link.data.get('href');
    return (
      <span className={styles.linkEditor}>
        <input
          ref={ref => (this.input = ref)}
          defaultValue={href}
          placeholder="http://"
          onBlur={this.props.onBlur}
          onKeyDown={this.onKeyDown}
          autoFocus
        />
        <button className={styles.button} onMouseDown={this.removeLink}>
          <CloseIcon light />
        </button>
      </span>
    );
  }
}
