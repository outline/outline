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
    onCancel: Function,
  };

  onKeyDown = ev => {
    if (ev.which === 13) {
      ev.preventDefault();
      this.save(ev.target.value);
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
    return (
      <span>
        <input
          ref={ref => (this.input = ref)}
          defaultValue={this.props.link.data.get('href')}
          onMouseDown={this.props.onFocus}
          onBlur={this.props.onBlur}
          onKeyDown={this.onKeyDown}
        />
        <button onMouseDown={this.removeLink}>x</button>
      </span>
    );
  }
}
