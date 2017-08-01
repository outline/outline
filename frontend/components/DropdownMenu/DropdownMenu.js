// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { color } from 'styles/constants';

type MenuItemProps = {
  onClick?: Function,
  children?: React.Element<any>,
};

const DropdownMenuItem = ({ onClick, children }: MenuItemProps) => {
  return (
    <MenuItem onClick={onClick}>
      {children}
    </MenuItem>
  );
};

type DropdownMenuProps = {
  label: React.Element<any>,
  children?: React.Element<any>,
};

@observer class DropdownMenu extends React.Component {
  props: DropdownMenuProps;
  @observable menuOpen: boolean = false;

  handleClick = () => {
    this.menuOpen = !this.menuOpen;
  };

  render() {
    return (
      <MenuContainer onClick={this.handleClick}>
        {this.menuOpen && <Backdrop />}
        {this.props.label}

        {this.menuOpen &&
          <Menu>
            {this.props.children}
          </Menu>}
      </MenuContainer>
    );
  }
}

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
`;

const MenuContainer = styled.div`
  display: flex;
  position: relative;
`;

const Menu = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 1000;
  border: 1px solid #eee;
  background-color: ${color.white};
  min-width: 160px;
`;

const MenuItem = styled.div`
  margin: 0;
  padding: 5px 10px;
  height: 32px;

  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-left: 2px solid transparent;

  span {
    margin-top: 2px;
  }

  a {
    text-decoration: none;
    width: 100%;
  }

  &:hover {
    border-left: 2px solid ${color.primary};
  }
`;

export { DropdownMenu, DropdownMenuItem };
