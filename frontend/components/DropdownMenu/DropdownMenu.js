// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Flex from 'components/Flex';
import { color } from 'styles/constants';
import { fadeAndScaleIn } from 'styles/animations';

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
  cursor: pointer;
`;

const MenuContainer = styled.div`
  position: relative;
`;

const Menu = styled.div`
  animation: ${fadeAndScaleIn} 250ms ease;
  transform-origin: 75% 0;

  position: absolute;
  right: 0;
  z-index: 1000;
  border: ${color.slateLight};
  background: ${color.white};
  border-radius: 2px;
  min-width: 160px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 4px 8px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.08);
`;

export default DropdownMenu;
