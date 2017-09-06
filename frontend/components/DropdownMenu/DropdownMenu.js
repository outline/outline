// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Flex from 'components/Flex';
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
  style?: Object,
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

        <Label>
          {this.props.label}
        </Label>

        {this.menuOpen &&
          <Menu style={this.props.style}>
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

const Label = styled(Flex).attrs({
  justify: 'center',
  align: 'center',
})`
  z-index: 1000;
`;

const MenuContainer = styled.div`
  position: relative;
`;

const Menu = styled.div`
  position: absolute;
  right: 0;
  z-index: 1000;
  border: 1px solid #eee;
  background-color: #fff;
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
