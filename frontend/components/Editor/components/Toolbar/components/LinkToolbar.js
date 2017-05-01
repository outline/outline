// @flow
import React, { Component } from 'react';
import keydown from 'react-keydown';

@keydown
export default class LinkToolbar extends Component {
  props: {
    state: Object,
    link: Object,
    onBlur: Function,
    onFocus: Function,
    onChange: Function,
  };

  componentDidMount() {
    this.input.focus();
  }

  onKeyDown = ev => {
    switch (ev.which) {
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

  save = href => {
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
      <span>
        <input
          ref={ref => (this.input = ref)}
          defaultValue={href}
          onMouseDown={this.props.onFocus}
          onFocus={this.props.onFocus}
          onBlur={this.props.onBlur}
          onKeyDown={this.onKeyDown}
        />
        <button onMouseDown={this.removeLink}>x</button>
      </span>
    );
  }
}
