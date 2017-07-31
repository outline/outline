// @flow
import React from 'react';
import styled from 'styled-components';
import Popover from 'components/Popover';

type Props = {
  onClick: Function,
  disabled?: boolean,
  lockedByName: string,
};

class EditAction extends React.Component {
  anchor: HTMLElement;
  props: Props;
  state: { opened: boolean };
  state = { opened: false };

  onClick = (ev: MouseEvent) => {
    ev.preventDefault();

    if (this.props.disabled) {
      this.setState({ opened: true });
    } else {
      this.props.onClick();
    }
  };

  closePopover = () => {
    this.setState({ opened: false });
  };

  setRef = (ref: HTMLElement) => {
    this.anchor = ref;
  };

  render() {
    const { disabled, lockedByName } = this.props;

    return (
      <span>
        <Link
          href
          onClick={this.onClick}
          style={{ opacity: disabled ? 0.5 : 1 }}
          title="Edit (e)"
          ref={this.setRef}
        >
          Edit
        </Link>
        {this.state.opened &&
          <Popover anchor={this.anchor} onClose={this.closePopover}>
            <strong>
              {lockedByName || 'Someone'} is editing this document
            </strong>
            <p>
              You'll have to wait a little bit - once they finish you'll be able to make changes.
            </p>
          </Popover>}
      </span>
    );
  }
}

const Link = styled.a`
  display: flex;
  align-items: center;
`;

export default EditAction;
