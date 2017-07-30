// @flow
import React from 'react';
import styled from 'styled-components';

type Props = {
  onClick: Function,
  disabled?: boolean,
};

class EditAction extends React.Component {
  props: Props;

  onClick = (event: MouseEvent) => {
    if (this.props.disabled) return;

    event.preventDefault();
    this.props.onClick();
  };

  render() {
    const { disabled } = this.props;

    return (
      <Link
        href
        onClick={this.onClick}
        style={{ opacity: disabled ? 0.5 : 1 }}
        title="Edit (e)"
      >
        Edit
      </Link>
    );
  }
}

const Link = styled.a`
  display: flex;
  align-items: center;
`;

export default EditAction;
