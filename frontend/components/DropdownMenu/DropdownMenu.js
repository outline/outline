// @flow
import React, { Component } from 'react';
import onClickOutside from 'react-onclickoutside';
import styled from 'styled-components';
import MenuItem from './components/MenuItem';

const Label = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  min-height: 43px;
  margin: 0 5px;
  color: green;
`;

const Container = styled.div`
  position: relative;
`;

const Menu = styled.div`
  position: absolute;
  top: $headerHeight;
  right: 0;
  z-index: 1000;
  background: #fff;
  border-radius: 4px;
  min-width: 160px;
  box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 0 1px rgba(0,0,0,.35);
`;

@onClickOutside class DropdownMenu extends Component {
  static propTypes = {
    label: React.PropTypes.node.isRequired,
    children: React.PropTypes.node.isRequired,
  };

  state = {
    menuVisible: false,
  };

  handleClickOutside = () => {
    this.setState({ menuVisible: false });
  };

  onClick = () => {
    this.setState({ menuVisible: !this.state.menuVisible });
  };

  render() {
    return (
      <Container>
        <Label onClick={this.onClick}>
          {this.props.label}
        </Label>

        {this.state.menuVisible
          ? <Menu>
              {this.props.children}
            </Menu>
          : null}
      </Container>
    );
  }
}

export default DropdownMenu;
export { MenuItem };
